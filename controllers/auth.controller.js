const { validationResult } = require('express-validator');
const authService = require('../services/auth.service');

const authController = {
  // Sign up controller
  signUp: async (req, res) => {
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

      const { username, email, password, role } = req.body;
      console.log('SignUp Request:', { username, email, password, role });
      // Call auth service
      const result = await authService.signUp({
        username,
        email,
        password,
        role
      });

      console.log('SignUp Result:', result);

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: result
      });

    } catch (error) {
      console.error('SignUp Error:', error.message);
      
      // Handle specific errors
      if (error.message.includes('already exists') || error.message.includes('already taken')) {
        return res.status(409).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Registration failed. Please try again.'
      });
    }
  },

  // Sign in controller
  signIn: async (req, res) => {
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

      const { email, password } = req.body;

      // Call auth service
      const result = await authService.signIn({
        email,
        password
      });

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: result
      });

    } catch (error) {
      console.error('SignIn Error:', error.message);
      
      // Handle specific errors
      if (error.message.includes('Invalid email or password')) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      if (error.message.includes('deactivated')) {
        return res.status(403).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Login failed. Please try again.'
      });
    }
  },

  // Get profile controller
  getProfile: async (req, res) => {
    try {
      const userId = req.user.userId;

      const userProfile = await authService.getProfile(userId);

      res.status(200).json({
        success: true,
        message: 'Profile retrieved successfully',
        data: userProfile
      });

    } catch (error) {
      console.error('GetProfile Error:', error.message);
      
      if (error.message.includes('User not found')) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve profile'
      });
    }
  },

  // Verify token controller
  verifyToken: async (req, res) => {
    try {
      const user = req.user;

      res.status(200).json({
        success: true,
        message: 'Token is valid',
        data: { user }
      });

    } catch (error) {
      console.error('VerifyToken Error:', error.message);
      
      res.status(500).json({
        success: false,
        message: 'Token verification failed'
      });
    }
  },

  // Logout controller (client-side token removal)
  logout: async (req, res) => {
    try {
      res.status(200).json({
        success: true,
        message: 'Logout successful'
      });
    } catch (error) {
      console.error('Logout Error:', error.message);
      
      res.status(500).json({
        success: false,
        message: 'Logout failed'
      });
    }
  },

  // Get interviewers controller
  getInterviewers: async (req, res) => {
    try {
      const interviewers = await authService.getInterviewers();

      res.status(200).json({
        success: true,
        message: 'Interviewers retrieved successfully',
        data: interviewers
      });

    } catch (error) {
      console.error('GetInterviewers Error:', error.message);
      
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve interviewers'
      });
    }
  },

  // Start LinkedIn OAuth flow
  startLinkedInAuth: async (req, res) => {
    try {
      const userId = req.user.id;
      const result = await authService.getLinkedInAuthUrl(userId);

      res.status(200).json({
        success: true,
        authUrl: result.authUrl,
        message: 'Redirect to this URL to authorize LinkedIn'
      });
    } catch (error) {
      console.error('LinkedIn auth start error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to start LinkedIn authorization'
      });
    }
  },

  // Handle LinkedIn OAuth callback
  handleLinkedInCallback: async (req, res) => {
    try {
      const { code, state, error } = req.query;
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';

      if (error) {
        return res.redirect(`${frontendUrl}?linkedin_error=${encodeURIComponent(error)}`);
      }

      if (!code || !state) {
        return res.redirect(`${frontendUrl}?linkedin_error=missing_parameters`);
      }

      const result = await authService.handleLinkedInCallback(code, state);

      // Redirect back to frontend with success/error status
      const redirectUrl = `${frontendUrl}?linkedin_connected=true&message=${encodeURIComponent(result.message)}`;
      res.redirect(redirectUrl);
    } catch (error) {
      console.error('LinkedIn callback error:', error);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
      const redirectUrl = `${frontendUrl}?linkedin_error=${encodeURIComponent(error.message)}`;
      res.redirect(redirectUrl);
    }
  },

  // Get LinkedIn status controller
  getLinkedInStatus: async (req, res) => {
    try {
      const userId = req.user.id;

      const status = await authService.getLinkedInStatus(userId);

      res.status(200).json({
        success: true,
        message: 'LinkedIn status retrieved successfully',
        data: status
      });

    } catch (error) {
      console.error('GetLinkedInStatus Error:', error.message);
      
      if (error.message.includes('User not found')) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve LinkedIn status'
      });
    }
  },

  // Disconnect LinkedIn controller
  disconnectLinkedIn: async (req, res) => {
    try {
      const userId = req.user.id;

      const result = await authService.disconnectLinkedIn(userId);

      res.status(200).json({
        success: true,
        message: result.message,
        data: {
          isConnected: result.isConnected
        }
      });

    } catch (error) {
      console.error('DisconnectLinkedIn Error:', error.message);
      
      if (error.message.includes('User not found')) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to disconnect LinkedIn'
      });
    }
  }
};

module.exports = authController;
