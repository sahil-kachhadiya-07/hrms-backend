const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters long'],
    maxlength: [30, 'Username cannot exceed 30 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please provide a valid email address'
    ]
  },
  password: {
    type: String,
    // required: [true, 'Password is required'],
    // minlength: [6, 'Password must be at least 6 characters long'],
    select: false // Don't include password in queries by default
  },
  role: {
    type: String,
    enum: {
      values: ['hr', 'interviewer'],
      message: 'Role must be either hr or interviewer'
    },
    required: [true, 'Role is required'],
    lowercase: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // LinkedIn integration credentials
  linkedinCredentials: {
    // OAuth tokens
    accessToken: {
      type: String,
      select: false
    },
    refreshToken: {
      type: String,
      select: false
    },
    tokenExpiry: {
      type: Date,
      select: false
    },
    
    // User profile info from LinkedIn
    linkedinId: {
      type: String,
      select: false
    },
    linkedinEmail: {
      type: String,
      select: false,
      trim: true,
      lowercase: true
    },
    linkedinProfile: {
      firstName: String,
      lastName: String,
      profilePicture: String
    },
    
    // Connection status
    isConnected: {
      type: Boolean,
      default: false
    },
    lastConnected: {
      type: Date
    },
    
    // OAuth state for security
    oauthState: {
      type: String,
      select: false
    }
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.__v;
      return ret;
    }
  }
});

// Index for better query performance
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ role: 1 });

// Pre-save middleware to hash password and LinkedIn credentials
userSchema.pre('save', async function(next) {
  try {
    // Hash main password if modified
    if (this.isModified('password')) {
      const salt = await bcrypt.genSalt(12);
      this.password = await bcrypt.hash(this.password, salt);
    }
    
    // No longer need to hash LinkedIn password since we're using OAuth
    
    next();
  } catch (error) {
    next(error);
  }
});

// Instance method to check password
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

// Instance method to update last login
userSchema.methods.updateLastLogin = function() {
  this.lastLogin = new Date();
  return this.save({ validateBeforeSave: false });
};

// Static method to find by email
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

// Static method to find by username
userSchema.statics.findByUsername = function(username) {
  return this.findOne({ username: username.toLowerCase() });
};

// LinkedIn OAuth methods
userSchema.methods.setLinkedInTokens = async function(tokens, profile) {
  this.linkedinCredentials.accessToken = tokens.access_token;
  this.linkedinCredentials.refreshToken = tokens.refresh_token;
  
  // Calculate token expiry
  if (tokens.expires_in) {
    this.linkedinCredentials.tokenExpiry = new Date(Date.now() + tokens.expires_in * 1000);
  }
  
  // Set profile information
  if (profile) {
    this.linkedinCredentials.linkedinId = profile.id;
    this.linkedinCredentials.linkedinEmail = profile.email;
    if (profile.firstName || profile.lastName) {
      this.linkedinCredentials.linkedinProfile = {
        firstName: profile.firstName,
        lastName: profile.lastName,
        profilePicture: profile.profilePicture
      };
    }
  }
  
  this.linkedinCredentials.isConnected = true;
  this.linkedinCredentials.lastConnected = new Date();
  return this.save();
};

userSchema.methods.getLinkedInTokens = function() {
  return {
    accessToken: this.linkedinCredentials.accessToken,
    refreshToken: this.linkedinCredentials.refreshToken,
    tokenExpiry: this.linkedinCredentials.tokenExpiry,
    linkedinId: this.linkedinCredentials.linkedinId
  };
};

userSchema.methods.isLinkedInTokenValid = function() {
  if (!this.linkedinCredentials.accessToken) return false;
  if (!this.linkedinCredentials.tokenExpiry) return true; // No expiry set, assume valid
  return new Date() < this.linkedinCredentials.tokenExpiry;
};

userSchema.methods.getLinkedInCredentials = function() {
  return {
    isConnected: this.linkedinCredentials.isConnected,
    lastConnected: this.linkedinCredentials.lastConnected,
    linkedinEmail: this.linkedinCredentials.linkedinEmail,
    profile: this.linkedinCredentials.linkedinProfile,
    tokenValid: this.isLinkedInTokenValid()
  };
};

userSchema.methods.setOAuthState = function(state) {
  this.linkedinCredentials.oauthState = state;
  return this.save();
};

userSchema.methods.verifyOAuthState = function(state) {
  return this.linkedinCredentials.oauthState === state;
};

userSchema.methods.disconnectLinkedIn = function() {
  this.linkedinCredentials = {
    accessToken: null,
    refreshToken: null,
    tokenExpiry: null,
    linkedinId: null,
    linkedinEmail: null,
    linkedinProfile: {},
    isConnected: false,
    lastConnected: null,
    oauthState: null
  };
  return this.save();
};

module.exports = mongoose.model('User', userSchema);
