const axios = require('axios');
const https = require('https');

// Configuration
const getLinkedInConfig = () => ({
  clientId: process.env.LINKEDIN_CLIENT_ID,
  clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
  redirectUri: process.env.LINKEDIN_REDIRECT_URI || 'http://localhost:5000/api/auth/linkedin/callback',
  baseUrl: 'https://api.linkedin.com/v2',
  authUrl: 'https://www.linkedin.com/oauth/v2',
  // Updated scopes for LinkedIn API v2 - using only what's necessary and available
  scopes: [
    'openid',
    'profile', 
    'email',
    'w_member_social'
  ]
});

/**
 * Create axios instance with proper SSL configuration
 * @returns {Object} Configured axios instance
 */
const createAxiosInstance = () => {
  const config = {};
  
  if (process.env.NODE_ENV === 'development' || process.env.DISABLE_SSL_VALIDATION === 'true') {
    console.warn('⚠️  SSL verification disabled - only use in development!');
    config.httpsAgent = new https.Agent({
      rejectUnauthorized: false
    });
  } else {
    config.httpsAgent = new https.Agent({
      rejectUnauthorized: true
    });
  }
  
  return axios.create(config);
};

// Global axios instance
const axiosInstance = createAxiosInstance();

/**
 * Generate LinkedIn OAuth authorization URL
 * @param {string} state - State parameter for CSRF protection
 * @returns {string} Authorization URL
 */
const getAuthorizationUrl = (state = 'random-state') => {
  const config = getLinkedInConfig();
  
  if (!config.clientId) {
    throw new Error('LinkedIn Client ID not configured. Please set LINKEDIN_CLIENT_ID in environment variables.');
  }

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    state: state,
    scope: config.scopes.join(' ')
  });

  return `${config.authUrl}/authorization?${params.toString()}`;
};

/**
 * Exchange authorization code for access token
 * @param {string} code - Authorization code from LinkedIn
 * @returns {Object} Token response
 */
const exchangeCodeForToken = async (code) => {
  try {
    const config = getLinkedInConfig();
    
    const tokenData = {
      grant_type: 'authorization_code',
      code: code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri
    };

    const response = await axiosInstance.post(
      `${config.authUrl}/accessToken`,
      new URLSearchParams(tokenData),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('LinkedIn token exchange error:', error.response?.data || error.message);
    
    if (error.message && error.message.includes('self-signed certificate')) {
      console.error('SSL Certificate Issue: Consider setting NODE_ENV=development or DISABLE_SSL_VALIDATION=true for development environments');
    }
    
    return {
      success: false,
      error: error.response?.data || error.message
    };
  }
};

/**
 * Get user profile using OpenID Connect userinfo endpoint
 * This is the primary method for getting user information
 * @param {string} accessToken - Access token
 * @returns {Object} User profile
 */
const getUserProfile = async (accessToken) => {
  try {
    // Use OpenID Connect userinfo endpoint - this is the correct way
    const response = await axiosInstance.get('https://api.linkedin.com/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    });

    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('LinkedIn profile fetch error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data || error.message
    };
  }
};

/**
 * Get user email using OpenID Connect userinfo endpoint
 * @param {string} accessToken - Access token
 * @returns {Object} User email and profile info
 */
const getUserInfo = async (accessToken) => {
  try {
    // Use OpenID Connect userinfo endpoint which works with 'openid', 'profile', 'email' scopes
    const response = await axiosInstance.get('https://api.linkedin.com/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    });

    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('LinkedIn userinfo fetch error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data || error.message
    };
  }
};

/**
 * Get complete user information - simplified version using only userinfo endpoint
 * @param {string} accessToken - Access token
 * @returns {Object} Complete user information
 */
const getCompleteUserInfo = async (accessToken) => {
  try {
    // Get user info from OpenID Connect endpoint (includes email and profile)
    const userInfoResult = await getUserInfo(accessToken);
    
    if (!userInfoResult.success) {
      return userInfoResult;
    }

    // Transform the data to match expected format
    const userData = userInfoResult.data;
    
    return {
      success: true,
      data: {
        // OpenID Connect standard fields
        sub: userData.sub, // LinkedIn ID
        email: userData.email,
        email_verified: userData.email_verified,
        given_name: userData.given_name,
        family_name: userData.family_name,
        name: userData.name,
        picture: userData.picture,
        locale: userData.locale,
        
        // Map to our expected format
        linkedinId: userData.sub,
        firstName: userData.given_name,
        lastName: userData.family_name,
        fullName: userData.name,
        profilePicture: userData.picture
      }
    };
    
  } catch (error) {
    console.error('Failed to get complete user info:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Get LinkedIn person ID from userinfo for posting
 * LinkedIn posting requires the person URN, which we can derive from the sub field
 * @param {string} accessToken - Access token
 * @returns {Object} Person ID info
 */
const getPersonId = async (accessToken) => {
  try {
    const userInfoResult = await getUserInfo(accessToken);
    
    if (!userInfoResult.success) {
      return userInfoResult;
    }

    return {
      success: true,
      data: {
        personId: userInfoResult.data.sub,
        personUrn: `urn:li:person:${userInfoResult.data.sub}`
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Create a LinkedIn post using UGC API
 * @param {string} accessToken - Access token
 * @param {string} personId - LinkedIn person ID (from userinfo sub field)
 * @param {Object} postData - Post content and metadata
 * @returns {Object} Post creation result
 */
const createPost = async (accessToken, personId, postData) => {
  try {
    const config = getLinkedInConfig();
    
    // Truncate content to LinkedIn max length (3000 characters)
    const MAX_COMMENTARY_LENGTH = 3000;
    let commentaryText = postData.content || '';
    if (commentaryText.length > MAX_COMMENTARY_LENGTH) {
      console.warn(`Truncating post content from ${commentaryText.length} to ${MAX_COMMENTARY_LENGTH} characters.`);
      commentaryText = commentaryText.substring(0, MAX_COMMENTARY_LENGTH);
    }
    const postPayload = {
      author: `urn:li:person:${personId}`,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: {
            text: commentaryText
          },
          shareMediaCategory: 'NONE'
        }
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
      }
    };

    // If there's an image, add it to the post
    if (postData.imageUrl) {
      postPayload.specificContent['com.linkedin.ugc.ShareContent'].shareMediaCategory = 'IMAGE';
      postPayload.specificContent['com.linkedin.ugc.ShareContent'].media = [{
        status: 'READY',
        description: {
          text: postData.title || 'Job posting'
        },
        media: postData.imageUrl,
        title: {
          text: postData.title || 'Job Opportunity'
        }
      }];
    }

    // Log the UGC post payload for debugging
    console.log('LinkedIn UGC post payload:', JSON.stringify(postPayload, null, 2));

    const response = await axiosInstance.post(
      `${config.baseUrl}/ugcPosts`,
      postPayload,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0'
        }
      }
    );

    return {
      success: true,
      data: response.data,
      message: 'Post created successfully on LinkedIn'
    };
  } catch (error) {
    console.error('LinkedIn post creation error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data || error.message,
      message: 'Failed to create LinkedIn post'
    };
  }
};

/**
 * Validate access token by checking userinfo endpoint
 * @param {string} accessToken - Access token to validate
 * @returns {Object} Validation result
 */
const validateToken = async (accessToken) => {
  try {
    const response = await axiosInstance.get('https://api.linkedin.com/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    });

    return {
      success: true,
      valid: true,
      userId: response.data.sub // Use 'sub' field as LinkedIn ID
    };
  } catch (error) {
    return {
      success: false,
      valid: false,
      error: error.response?.data || error.message
    };
  }
};

/**
 * Refresh access token
 * @param {string} refreshToken - Refresh token
 * @returns {Object} Token response
 */
const refreshAccessToken = async (refreshToken) => {
  try {
    const config = getLinkedInConfig();
    
    const tokenData = {
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: config.clientId,
      client_secret: config.clientSecret
    };

    const response = await axiosInstance.post(
      `${config.authUrl}/accessToken`,
      new URLSearchParams(tokenData),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('LinkedIn token refresh error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data || error.message
    };
  }
};

/**
 * Test connection to LinkedIn API
 * @returns {Object} Connection test result
 */
const testConnection = async () => {
  try {
    const config = getLinkedInConfig();
    
    console.log('Testing LinkedIn OAuth connection...');
    console.log('Environment:', process.env.NODE_ENV || 'not set');
    console.log('Client ID configured:', !!config.clientId);
    console.log('Client Secret configured:', !!config.clientSecret);
    console.log('Redirect URI:', config.redirectUri);
    
    // Test basic connectivity to LinkedIn OAuth endpoint
    const response = await axiosInstance.get(`${config.authUrl}/.well-known/openid-configuration`);
    
    return {
      success: true,
      message: 'LinkedIn OAuth connection successful',
      config: {
        clientIdSet: !!config.clientId,
        clientSecretSet: !!config.clientSecret,
        redirectUri: config.redirectUri,
        environment: process.env.NODE_ENV || 'not set'
      },
      openIdConfig: response.data
    };
  } catch (error) {
    const config = getLinkedInConfig();
    return {
      success: false,
      message: 'LinkedIn OAuth connection failed',
      error: error.message,
      config: {
        clientIdSet: !!config.clientId,
        clientSecretSet: !!config.clientSecret,
        redirectUri: config.redirectUri,
        environment: process.env.NODE_ENV || 'not set'
      }
    };
  }
};

module.exports = {
  getAuthorizationUrl,
  exchangeCodeForToken,
  getUserProfile,
  getUserInfo,
  getCompleteUserInfo,
  getPersonId, // New function to get person ID for posting
  createPost,
  validateToken,
  refreshAccessToken,
  testConnection
};