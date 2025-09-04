const { validationResult } = require('express-validator');
const jobService = require('../services/job.service');
const aiService = require('../services/ai.service');

const jobController = {
  // Create new job
  createJob: async (req, res) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { title, description, interviewer } = req.body;
      const userId = req.user.id;

      // Call job service
      const result = await jobService.createJob({
        title,
        description,
        interviewer
      }, userId);

      res.status(201).json({
        success: true,
        message: 'Job created successfully',
        data: result
      });

    } catch (error) {
      console.error('CreateJob Error:', error.message);
      
      res.status(500).json({
        success: false,
        message: 'Job creation failed. Please try again.'
      });
    }
  },

  // Get all jobs for authenticated user
  getJobs: async (req, res) => {
    try {
      const userId = req.user.id;
      const { status } = req.query;

      // Build filters
      const filters = {};
      if (status && ['draft', 'published', 'closed'].includes(status)) {
        filters.status = status;
      }

      const jobs = await jobService.getJobsByUser(userId, filters);

      res.status(200).json({
        success: true,
        message: 'Jobs retrieved successfully',
        data: jobs
      });

    } catch (error) {
      console.error('GetJobs Error:', error.message);
      
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve jobs'
      });
    }
  },

  // Get specific job by ID
  getJobById: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const job = await jobService.getJobById(id, userId);

      res.status(200).json({
        success: true,
        message: 'Job retrieved successfully',
        data: job
      });

    } catch (error) {
      console.error('GetJobById Error:', error.message);
      
      if (error.message.includes('Job not found')) {
        return res.status(404).json({
          success: false,
          message: 'Job not found or access denied'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve job'
      });
    }
  },

  // Update job
  updateJob: async (req, res) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { id } = req.params;
      const userId = req.user.id;
      const updateData = req.body;

      const result = await jobService.updateJob(id, updateData, userId);

      res.status(200).json({
        success: true,
        message: 'Job updated successfully',
        data: result
      });

    } catch (error) {
      console.error('UpdateJob Error:', error.message);
      
      if (error.message.includes('Job not found')) {
        return res.status(404).json({
          success: false,
          message: 'Job not found or access denied'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Job update failed. Please try again.'
      });
    }
  },

  // Delete job
  deleteJob: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const result = await jobService.deleteJob(id, userId);

      res.status(200).json({
        success: true,
        message: result.message
      });

    } catch (error) {
      console.error('DeleteJob Error:', error.message);
      
      if (error.message.includes('Job not found')) {
        return res.status(404).json({
          success: false,
          message: 'Job not found or access denied'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Job deletion failed. Please try again.'
      });
    }
  },

  // Generate job post
  generateJobPost: async (req, res) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { id } = req.params;
      const { content, useAI = true, includeImage = true, companyInfo = '' } = req.body;
      const userId = req.user.id;

      let jobPostContent = content;
      let aiGeneratedData = null;

      // If no content provided or useAI is true, generate using AI
      if (!content || useAI) {
        try {
          // First get the job details
          const job = await jobService.getJobById(id, userId);
          
          // Generate content using AI
          const aiResult = await aiService.generateCompleteJobPost(
            job.title,
            job.description,
            companyInfo,
            includeImage
          );

          jobPostContent = aiResult.content.content;
          aiGeneratedData = {
            ai_generated: true,
            model_used: aiResult.content.model,
            tokens_used: aiResult.content.tokens_used,
            image_data: aiResult.image || null
          };

        } catch (aiError) {
          console.warn('AI generation failed:', aiError.message);
          
          // If AI fails and no manual content provided, return error
          if (!content) {
            return res.status(500).json({
              success: false,
              message: `AI generation failed: ${aiError.message}. Please provide manual content or check Gemini configuration.`,
              error_type: 'AI_GENERATION_FAILED'
            });
          }
          
          // If AI fails but manual content exists, continue with manual content
          console.log('Falling back to manual content');
        }
      }

      const result = await jobService.generateJobPost(id, userId, jobPostContent, aiGeneratedData);

      res.status(200).json({
        success: true,
        message: aiGeneratedData ? 'Job post generated successfully using AI' : 'Job post created successfully',
        data: result
      });

    } catch (error) {
      console.error('GenerateJobPost Error:', error.message);
      
      if (error.message.includes('Job not found')) {
        return res.status(404).json({
          success: false,
          message: 'Job not found or access denied'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Job post generation failed. Please try again.'
      });
    }
  },

  // Publish job post
  publishJobPost: async (req, res) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { id } = req.params;
      const { platforms, content: updatedContent } = req.body;
      const userId = req.user.id;

      const result = await jobService.publishJobPost(id, userId, platforms, updatedContent);

      // Check if there were any publishing failures
      const failures = result.publishResults?.filter(r => !r.success) || [];
      const successes = result.publishResults?.filter(r => r.success) || [];

      let message = 'Job post published successfully';
      let statusCode = 200;

      if (failures.length > 0 && successes.length === 0) {
        message = 'Job post publishing failed';
        statusCode = 500;
      } else if (failures.length > 0) {
        message = 'Job post published with some failures';
        statusCode = 207; // Multi-status
      }

      res.status(statusCode).json({
        success: failures.length === 0 || successes.length > 0,
        message: message,
        data: result,
        publishResults: result.publishResults
      });

    } catch (error) {
      console.error('PublishJobPost Error:', error.message);
      
      if (error.message.includes('Job not found')) {
        return res.status(404).json({
          success: false,
          message: 'Job not found or access denied'
        });
      }

      if (error.message.includes('must be generated first')) {
        return res.status(400).json({
          success: false,
          message: 'Job post content must be generated first'
        });
      }

      if (error.message.includes('LinkedIn credentials')) {
        return res.status(400).json({
          success: false,
          message: 'LinkedIn credentials not found. Please connect your LinkedIn account first.'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Job post publishing failed. Please try again.'
      });
    }
  },

  // Increment applications count
  incrementApplications: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const result = await jobService.incrementApplications(id, userId);

      res.status(200).json({
        success: true,
        message: 'Applications count updated successfully',
        data: result
      });

    } catch (error) {
      console.error('IncrementApplications Error:', error.message);
      
      if (error.message.includes('Job not found')) {
        return res.status(404).json({
          success: false,
          message: 'Job not found or access denied'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to update applications count'
      });
    }
  },

  // Get job statistics
  getJobStats: async (req, res) => {
    try {
      const userId = req.user.id;

      const stats = await jobService.getJobStats(userId);

      res.status(200).json({
        success: true,
        message: 'Job statistics retrieved successfully',
        data: stats
      });

    } catch (error) {
      console.error('GetJobStats Error:', error.message);
      
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve job statistics'
      });
    }
  }
};

module.exports = jobController;
