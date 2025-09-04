const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const { 
  getAuthorizationUrl,
  exchangeCodeForToken,
  getUserProfile,
  getUserInfo,
  getCompleteUserInfo,
  getPersonId,
  createPost,
  validateToken,
  refreshAccessToken,
  testConnection
} = require('./linkedin-oauth.service');
const linkedInOAuth = require('./linkedin-oauth.service');

const authService = {
  // Generate JWT token
  generateToken: (payload) => {
    return jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRE || '7d'
    });
  },

  // Verify JWT token
  verifyToken: (token) => {
    return jwt.verify(token, process.env.JWT_SECRET);
  },

  // Sign up new user
  signUp: async (userData) => {
    const { username, email, password, role } = userData;

    // Check if user already exists
    const existingUserByEmail = await User.findByEmail(email);
    if (existingUserByEmail) {
      throw new Error('User with this email already exists');
    }

    const existingUserByUsername = await User.findByUsername(username);
    if (existingUserByUsername) {
      throw new Error('Username already taken');
    }

    // Create new user
    const user = new User({
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      password,
      role: role.toLowerCase()
    });

    await user.save();

    // Generate token
    const token = authService.generateToken({
      userId: user._id,
      email: user.email,
      role: user.role
    });

    return {
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt
      },
      token
    };
  },

  // Sign in user
  signIn: async (loginData) => {
    const { email, password } = loginData;

    // Find user by email and include password field
    const user = await User.findByEmail(email).select('+password');
    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new Error('Account is deactivated. Please contact administrator');
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    // Update last login
    await user.updateLastLogin();

    // Generate token
    const token = authService.generateToken({
      userId: user._id,
      email: user.email,
      role: user.role
    });

    return {
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt
      },
      token
    };
  },

  // Get user profile
  getProfile: async (userId) => {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    return {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  },

  // Verify user token and get user data
  verifyUserToken: async (token) => {
    try {
      const decoded = authService.verifyToken(token);
      const user = await User.findById(decoded.userId);
      
      if (!user || !user.isActive) {
        throw new Error('User not found or inactive');
      }

      return {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        isActive: user.isActive
      };
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  },

  // Get all interviewers
  getInterviewers: async () => {
    try {
      const interviewers = await User.find({
        role: 'interviewer',
        isActive: true
      }).select('username email').sort({ username: 1 });

      return interviewers.map(interviewer => ({
        id: interviewer._id,
        username: interviewer.username,
        email: interviewer.email
      }));
    } catch (error) {
      throw new Error('Failed to retrieve interviewers');
    }
  },

  // Generate LinkedIn OAuth URL
  getLinkedInAuthUrl: async (userId) => {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Generate a secure state parameter
      const state = `${userId}_${Date.now()}_${Math.random().toString(36).substring(2)}`;
      await user.setOAuthState(state);

      const authUrl = getAuthorizationUrl(state);

      return {
        success: true,
        authUrl: authUrl,
        state: state
      };
    } catch (error) {
      console.error('LinkedIn auth URL generation error:', error);
      throw new Error('Failed to generate LinkedIn authorization URL');
    }
  },

  // Handle LinkedIn OAuth callback
  handleLinkedInCallback: async (code, state) => {
    try {
      // Extract userId from state
      const stateParts = state.split('_');
      if (stateParts.length < 3) {
        throw new Error('Invalid state parameter');
      }

      const userId = stateParts[0];
      const user = await User.findById(userId).select('+linkedinCredentials.oauthState');
      if (!user) {
        throw new Error('User not found');
      }

      // Verify state parameter
      if (!user.verifyOAuthState(state)) {
        throw new Error('Invalid state parameter - possible CSRF attack');
      }

      // Exchange code for tokens
      const tokenResult = await exchangeCodeForToken(code);
      if (!tokenResult.success) {
        throw new Error(`Failed to exchange authorization code: ${tokenResult.error}`);
      }

      // Get complete user information using the updated function
      const userInfoResult = await getCompleteUserInfo(tokenResult.data.access_token);

      if (!userInfoResult.success) {
        throw new Error(`Failed to get user profile: ${userInfoResult.error}`);
      }

      // Map the profile data from OpenID Connect format
      const userData = userInfoResult.data;
      const profile = {
        id: userData.sub || userData.linkedinId, // 'sub' is the LinkedIn ID in OpenID Connect
        firstName: userData.given_name || userData.firstName,
        lastName: userData.family_name || userData.lastName,
        fullName: userData.name || userData.fullName,
        email: userData.email,
        profilePicture: userData.picture || userData.profilePicture,
        locale: userData.locale,
        email_verified: userData.email_verified
      };

      // Save tokens and profile
      await user.setLinkedInTokens(tokenResult.data, profile);

      return {
        message: 'LinkedIn account connected successfully',
        isConnected: true,
        profile: profile
      };
    } catch (error) {
      console.error('LinkedIn callback handling error:', error);
      throw error;
    }
  },

  // Get LinkedIn connection status
  getLinkedInStatus: async (userId) => {
    try {
      const user = await User.findById(userId).select(
        '+linkedinCredentials.accessToken +linkedinCredentials.refreshToken +linkedinCredentials.tokenExpiry +linkedinCredentials.isConnected +linkedinCredentials.lastConnected +linkedinCredentials.linkedinEmail +linkedinCredentials.linkedinProfile'
      );
      if (!user) {
        throw new Error('User not found');
      }

      let credentials = user.getLinkedInCredentials();

      // Auto-refresh expired access token if a refresh token is available
      if (!credentials.tokenValid && user.linkedinCredentials.refreshToken) {
        console.log('Attempting to refresh expired LinkedIn token...');
        const refreshResult = await linkedInOAuth.refreshAccessToken(user.linkedinCredentials.refreshToken);
        if (refreshResult.success) {
          // Persist new tokens
          await user.setLinkedInTokens(refreshResult.data, null);
          credentials = user.getLinkedInCredentials();
          console.log('LinkedIn token refreshed successfully');
        } else {
          console.error('Failed to refresh LinkedIn token:', refreshResult.error);
        }
      }

      // Augment the returned credentials with raw token info for frontend usage
      credentials.accessToken = user.linkedinCredentials.accessToken;
      credentials.refreshToken = user.linkedinCredentials.refreshToken;
      credentials.tokenExpiry = user.linkedinCredentials.tokenExpiry;
      return credentials;
    } catch (error) {
      console.error('GetLinkedInStatus Error:', error.message);
      throw error;
    }
  },

  // Disconnect LinkedIn
  disconnectLinkedIn: async (userId) => {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      await user.disconnectLinkedIn();

      return {
        message: 'LinkedIn disconnected successfully',
        isConnected: false
      };
    } catch (error) {
      console.error('Error disconnecting LinkedIn:', error);
      throw error;
    }
  },

  // Get LinkedIn credentials for internal use (with tokens)
  getLinkedInCredentialsForService: async (userId) => {
    try {
      const user = await User.findById(userId).select('+linkedinCredentials.accessToken +linkedinCredentials.refreshToken +linkedinCredentials.tokenExpiry +linkedinCredentials.linkedinId');
      
      if (!user || !user.linkedinCredentials?.isConnected) {
        return null;
      }

      const tokens = user.getLinkedInTokens();
      
      // Check if token needs refresh
      if (!user.isLinkedInTokenValid() && tokens.refreshToken) {
        console.log('Refreshing LinkedIn token for service use...');
        const refreshResult = await refreshAccessToken(tokens.refreshToken);
        if (refreshResult.success) {
          await user.setLinkedInTokens(refreshResult.data, null);
          return user.getLinkedInTokens();
        } else {
          console.error('Failed to refresh token for service use:', refreshResult.error);
          return null;
        }
      }

      return tokens;
    } catch (error) {
      console.error('Error getting LinkedIn credentials for service:', error);
      return null;
    }
  },

  // Post to LinkedIn - wrapper function
  postToLinkedIn: async (userId, postContent) => {
    try {
      // Get valid credentials
      const credentials = await authService.getLinkedInCredentialsForService(userId);
      if (!credentials || !credentials.accessToken) {
        throw new Error('No valid LinkedIn credentials found');
      }

      // Get the person ID for posting
      const personResult = await getPersonId(credentials.accessToken);
      if (!personResult.success) {
        throw new Error(`Failed to get LinkedIn person ID: ${personResult.error}`);
      }

      // Create the post
      const postResult = await createPost(
        credentials.accessToken, 
        personResult.data.personId, 
        postContent
      );

      return postResult;
    } catch (error) {
      console.error('Error posting to LinkedIn:', error);
      throw error;
    }
  },

  // Test LinkedIn connection
  testLinkedInConnection: async (userId) => {
    try {
      const credentials = await authService.getLinkedInCredentialsForService(userId);
      if (!credentials || !credentials.accessToken) {
        return {
          success: false,
          message: 'No LinkedIn credentials found'
        };
      }

      // Test by validating the token
      const validationResult = await validateToken(credentials.accessToken);
      
      if (validationResult.success && validationResult.valid) {
        // Also try to get user info to fully verify
        const userInfoResult = await getUserInfo(credentials.accessToken);
        
        return {
          success: true,
          message: 'LinkedIn connection is working',
          userInfo: userInfoResult.success ? {
            id: userInfoResult.data.sub,
            name: userInfoResult.data.name,
            email: userInfoResult.data.email
          } : null
        };
      } else {
        return {
          success: false,
          message: 'LinkedIn token is invalid or expired',
          error: validationResult.error
        };
      }
    } catch (error) {
      console.error('Error testing LinkedIn connection:', error);
      return {
        success: false,
        message: 'Failed to test LinkedIn connection',
        error: error.message
      };
    }
  }
};

module.exports = authService;