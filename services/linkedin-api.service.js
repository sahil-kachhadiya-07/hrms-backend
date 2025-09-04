const linkedInOAuth = require('./linkedin-oauth.service');

const linkedInApiService = {
  /**
   * Post job content to LinkedIn using API
   * @param {string} userId - User ID
   * @param {Object} jobData - Job posting data
   * @returns {Object} Result of the posting
   */
  postJob: async (userId, jobData) => {
    try {
      console.log('Starting LinkedIn API job posting...');
      console.log('User ID:', userId);
      console.log('Job title:', jobData.title);
      console.log('Content length:', jobData.content?.length || 0);

      // Get user's LinkedIn tokens from auth service
      const authService = require('./auth.service');
      const credentials = await authService.getLinkedInCredentialsForService(userId);
      
      if (!credentials) {
        return {
          success: false,
          message: 'LinkedIn account not connected. Please connect your LinkedIn account first.',
          platform: 'linkedin'
        };
      }

      if (!credentials.accessToken) {
        return {
          success: false,
          message: 'LinkedIn access token not available. Please reconnect your LinkedIn account.',
          platform: 'linkedin'
        };
      }

      console.log('LinkedIn credentials found, posting to API...');

      // Validate token before posting
      const tokenValidation = await linkedInOAuth.validateToken(credentials.accessToken);
      if (!tokenValidation.valid) {
        // Try to refresh token if we have a refresh token
        if (credentials.refreshToken) {
          console.log('Access token invalid, attempting refresh...');
          const refreshResult = await linkedInOAuth.refreshAccessToken(credentials.refreshToken);
          
          if (refreshResult.success) {
            console.log('Token refreshed successfully');
            // Update user tokens
            const User = require('../models/user.model');
            const user = await User.findById(userId);
            await user.setLinkedInTokens(refreshResult.data, null);
            credentials.accessToken = refreshResult.data.access_token;
          } else {
            return {
              success: false,
              message: 'LinkedIn access token expired and refresh failed. Please reconnect your LinkedIn account.',
              platform: 'linkedin'
            };
          }
        } else {
          return {
            success: false,
            message: 'LinkedIn access token expired. Please reconnect your LinkedIn account.',
            platform: 'linkedin'
          };
        }
      }

      // Prepare post content
      const postContent = `🚀 ${jobData.title}

${jobData.content}

#hiring #jobs #career #opportunity`;

      // Create the LinkedIn post
      const postResult = await linkedInOAuth.createPost(
        credentials.accessToken,
        credentials.linkedinId,
        {
          content: postContent,
          title: jobData.title,
          imageUrl: jobData.imageUrl
        }
      );

      if (postResult.success) {
        console.log('LinkedIn post created successfully:', postResult.data);
        return {
          success: true,
          message: 'Job posted to LinkedIn successfully via API',
          platform: 'linkedin',
          postedAt: new Date(),
          postId: postResult.data.id
        };
      } else {
        console.error('LinkedIn post creation failed:', postResult.error);
        return {
          success: false,
          message: `LinkedIn posting failed: ${postResult.message}`,
          platform: 'linkedin',
          error: postResult.error
        };
      }

    } catch (error) {
      console.error('LinkedIn API posting error:', error);
      return {
        success: false,
        message: `LinkedIn posting failed: ${error.message}`,
        platform: 'linkedin',
        error: error.message
      };
    }
  },

  /**
   * Test LinkedIn credentials by making a simple API call
   * @param {string} userId - User ID
   * @returns {Object} Test result
   */
  testCredentials: async (userId) => {
    try {
      const authService = require('./auth.service');
      const credentials = await authService.getLinkedInCredentialsForService(userId);
      
      if (!credentials || !credentials.accessToken) {
        return {
          success: false,
          message: 'LinkedIn account not connected'
        };
      }

      // Test the token by getting user profile
      const profileResult = await linkedInOAuth.getUserProfile(credentials.accessToken);
      
      if (profileResult.success) {
        return {
          success: true,
          message: 'LinkedIn credentials are valid',
          profile: profileResult.data
        };
      } else {
        return {
          success: false,
          message: 'LinkedIn credentials are invalid or expired',
          error: profileResult.error
        };
      }
    } catch (error) {
      console.error('LinkedIn credentials test error:', error);
      return {
        success: false,
        message: 'Failed to test LinkedIn credentials',
        error: error.message
      };
    }
  },

  /**
   * Get posting permissions for user
   * @param {string} userId - User ID
   * @returns {Object} Permissions result
   */
  getPostingPermissions: async (userId) => {
    try {
      const authService = require('./auth.service');
      const credentials = await authService.getLinkedInCredentialsForService(userId);
      
      if (!credentials || !credentials.accessToken) {
        return {
          success: false,
          canPost: false,
          message: 'LinkedIn account not connected'
        };
      }

      const permissionsResult = await linkedInOAuth.getPostingPermissions(credentials.accessToken);
      
      return {
        success: permissionsResult.success,
        canPost: permissionsResult.canPost,
        message: permissionsResult.success ? 'User has posting permissions' : 'User lacks posting permissions',
        userInfo: permissionsResult.userInfo
      };
    } catch (error) {
      console.error('LinkedIn permissions check error:', error);
      return {
        success: false,
        canPost: false,
        message: 'Failed to check LinkedIn permissions',
        error: error.message
      };
    }
  }
};

module.exports = linkedInApiService;
