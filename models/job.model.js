const mongoose = require('mongoose');

const jobPostSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
    trim: true
  },
  platforms: [{
    type: String,
    enum: ['linkedin', 'twitter', 'facebook', 'indeed', 'glassdoor'],
    trim: true
  }],
  publishedAt: {
    type: Date
  },
  imageUrl: {
    type: String,
    trim: true
  },
  aiMetadata: {
    isAiGenerated: {
      type: Boolean,
      default: false
    },
    modelUsed: {
      type: String,
      trim: true
    },
    tokensUsed: {
      type: Number
    },
    generatedAt: {
      type: Date
    },
    imagePrompt: {
      type: String,
      trim: true
    }
  }
}, {
  _id: true,
  timestamps: true
});

const jobSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Job title is required'],
    trim: true,
    minlength: [3, 'Job title must be at least 3 characters long'],
    maxlength: [200, 'Job title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Job description is required'],
    trim: true,
    minlength: [10, 'Job description must be at least 10 characters long'],
    maxlength: [5000, 'Job description cannot exceed 5000 characters']
  },
  interviewer: {
    type: String,
    required: [true, 'Interviewer is required'],
    trim: true
  },
  status: {
    type: String,
    enum: {
      values: ['draft', 'published', 'closed'],
      message: 'Status must be either draft, published, or closed'
    },
    default: 'draft',
    lowercase: true
  },
  applications: {
    type: Number,
    default: 0,
    min: [0, 'Applications count cannot be negative']
  },
  jobPost: jobPostSchema,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Index for better query performance
jobSchema.index({ createdBy: 1 });
jobSchema.index({ status: 1 });
jobSchema.index({ createdAt: -1 });
jobSchema.index({ title: 'text', description: 'text' });

// Static method to find jobs by user
jobSchema.statics.findByUser = function(userId, filters = {}) {
  const query = { 
    createdBy: userId, 
    isActive: true,
    ...filters 
  };
  return this.find(query).sort({ createdAt: -1 });
};

// Static method to find job by id and user
jobSchema.statics.findByIdAndUser = function(jobId, userId) {
  return this.findOne({ 
    _id: jobId, 
    createdBy: userId, 
    isActive: true 
  });
};

// Instance method to increment applications
jobSchema.methods.incrementApplications = function() {
  this.applications += 1;
  return this.save();
};

// Instance method to update status
jobSchema.methods.updateStatus = function(status) {
  this.status = status;
  return this.save();
};

// Instance method to add job post
jobSchema.methods.addJobPost = function(postData) {
  this.jobPost = {
    content: postData.content,
    platforms: postData.platforms || [],
    publishedAt: postData.publishedAt,
    imageUrl: postData.imageUrl || ''
  };
  
  // Add AI metadata if provided
  if (postData.aiMetadata) {
    this.jobPost.aiMetadata = postData.aiMetadata;
  }
  
  return this.save();
};

// Instance method to publish job post
jobSchema.methods.publishJobPost = function(platforms) {
  if (!this.jobPost) {
    throw new Error('Job post does not exist');
  }
  
  this.jobPost.platforms = platforms;
  this.jobPost.publishedAt = new Date();
  this.status = 'published';
  return this.save();
};

module.exports = mongoose.model('Job', jobSchema);
