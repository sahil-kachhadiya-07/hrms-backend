const Job = require('../models/job.model');
const linkedinService = require('./linkedin-api.service');

const jobService = {
  // Create a new job
  createJob: async (jobData, userId) => {
    const { title, description, interviewer } = jobData;

    // Create new job
    const job = new Job({
      title: title.trim(),
      description: description.trim(),
      interviewer: interviewer.trim(),
      createdBy: userId
    });

    await job.save();

    return {
      id: job._id,
      title: job.title,
      description: job.description,
      interviewer: job.interviewer,
      status: job.status,
      applications: job.applications,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      jobPost: job.jobPost
    };
  },

  // Get all jobs for a user
  getJobsByUser: async (userId, filters = {}) => {
    const jobs = await Job.findByUser(userId, filters);

    return jobs.map(job => ({
      id: job._id,
      title: job.title,
      description: job.description,
      interviewer: job.interviewer,
      status: job.status,
      applications: job.applications,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      jobPost: job.jobPost
    }));
  },

  // Get a specific job by ID
  getJobById: async (jobId, userId) => {
    const job = await Job.findByIdAndUser(jobId, userId);
    
    if (!job) {
      throw new Error('Job not found or access denied');
    }

    return {
      id: job._id,
      title: job.title,
      description: job.description,
      interviewer: job.interviewer,
      status: job.status,
      applications: job.applications,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      jobPost: job.jobPost
    };
  },

  // Update a job
  updateJob: async (jobId, updateData, userId) => {
    const job = await Job.findByIdAndUser(jobId, userId);
    
    if (!job) {
      throw new Error('Job not found or access denied');
    }

    // Update allowed fields
    if (updateData.title) job.title = updateData.title.trim();
    if (updateData.description) job.description = updateData.description.trim();
    if (updateData.interviewer) job.interviewer = updateData.interviewer.trim();
    if (updateData.status && ['draft', 'published', 'closed'].includes(updateData.status)) {
      job.status = updateData.status;
    }

    await job.save();

    return {
      id: job._id,
      title: job.title,
      description: job.description,
      interviewer: job.interviewer,
      status: job.status,
      applications: job.applications,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      jobPost: job.jobPost
    };
  },

  // Delete a job (soft delete)
  deleteJob: async (jobId, userId) => {
    const job = await Job.findByIdAndUser(jobId, userId);
    
    if (!job) {
      throw new Error('Job not found or access denied');
    }

    job.isActive = false;
    await job.save();

    return {
      message: 'Job deleted successfully'
    };
  },

  // Generate job post content
  generateJobPost: async (jobId, userId, content, aiMetadata = null) => {
    const job = await Job.findByIdAndUser(jobId, userId);
    
    if (!job) {
      throw new Error('Job not found or access denied');
    }

    const jobPostData = {
      content: content.trim(),
      platforms: [],
      publishedAt: undefined
    };

    // Add AI metadata if provided
    if (aiMetadata) {
      jobPostData.imageUrl = aiMetadata.image_data?.image_url || '';
      jobPostData.aiMetadata = {
        isAiGenerated: aiMetadata.ai_generated || false,
        modelUsed: aiMetadata.model_used || '',
        tokensUsed: aiMetadata.tokens_used || 0,
        generatedAt: new Date(),
        imagePrompt: aiMetadata.image_data?.prompt || ''
      };
    }

    await job.addJobPost(jobPostData);

    return {
      id: job._id,
      title: job.title,
      description: job.description,
      interviewer: job.interviewer,
      status: job.status,
      applications: job.applications,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      jobPost: job.jobPost
    };
  },

  // Publish job post to platforms
  publishJobPost: async (jobId, userId, platforms, updatedContent) => {
    const job = await Job.findByIdAndUser(jobId, userId);
    
    if (!job) {
      throw new Error('Job not found or access denied');
    }

    // If frontend provides updated content, override and save
    if (updatedContent) {
      job.jobPost.content = updatedContent.trim();
      await job.save();
    }
    if (!job.jobPost) {
      throw new Error('Job post content must be generated first');
    }

    const publishResults = [];
    
    // Handle LinkedIn posting if included in platforms
    if (platforms.includes('linkedin')) {
      try {
        console.log('Starting LinkedIn posting process...');
        console.log('Job title:', job.title);
        console.log('Job content length:', job.jobPost.content.length);
        
        const linkedinResult = await linkedinService.postJob(userId, {
          title: job.title,
          content: job.jobPost.content,
          imageUrl: job.jobPost.imageUrl
        });
        
        console.log('LinkedIn posting result:', linkedinResult);
        
        publishResults.push({
          platform: 'linkedin',
          success: true,
          message: linkedinResult.message,
          postedAt: linkedinResult.postedAt
        });
      } catch (error) {
        console.error('LinkedIn publishing failed:', error.message);
        console.error('LinkedIn error stack:', error.stack);
        publishResults.push({
          platform: 'linkedin',
          success: false,
          message: error.message,
          error: true
        });
      }
    }

    // Handle other platforms (existing functionality)
    const otherPlatforms = platforms.filter(p => p !== 'linkedin');
    if (otherPlatforms.length > 0) {
      await job.publishJobPost(otherPlatforms);
    } else {
      // If only LinkedIn, still update the job post platforms
      await job.publishJobPost(platforms);
    }

    // Refresh job data
    await job.save();

    return {
      id: job._id,
      title: job.title,
      description: job.description,
      interviewer: job.interviewer,
      status: job.status,
      applications: job.applications,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      jobPost: job.jobPost,
      publishResults: publishResults
    };
  },

  // Increment applications count
  incrementApplications: async (jobId, userId) => {
    const job = await Job.findByIdAndUser(jobId, userId);
    
    if (!job) {
      throw new Error('Job not found or access denied');
    }

    await job.incrementApplications();

    return {
      id: job._id,
      applications: job.applications
    };
  },

  // Get job statistics
  getJobStats: async (userId) => {
    const jobs = await Job.findByUser(userId);

    const stats = {
      total: jobs.length,
      published: jobs.filter(job => job.status === 'published').length,
      draft: jobs.filter(job => job.status === 'draft').length,
      closed: jobs.filter(job => job.status === 'closed').length,
      totalApplications: jobs.reduce((sum, job) => sum + job.applications, 0)
    };

    return stats;
  }
};

module.exports = jobService;
