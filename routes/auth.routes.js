const express = require('express');
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middleware/auth.middleware');
const validationMiddleware = require('../middleware/validation.middleware');

const router = express.Router();

// Public routes
/**
 * @route   POST /api/auth/signup
 * @desc    Register a new user
 * @access  Public
 */
router.post('/signup', 
  validationMiddleware.validateSignUp,
  authController.signUp
);

/**
 * @route   POST /api/auth/signin
 * @desc    Authenticate user and get token
 * @access  Public
 */
router.post('/signin', 
  validationMiddleware.validateSignIn,
  authController.signIn
);

// Protected routes
/**
 * @route   GET /api/auth/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/profile', 
  authMiddleware.verifyToken,
  authController.getProfile
);

/**
 * @route   GET /api/auth/verify
 * @desc    Verify token validity
 * @access  Private
 */
router.get('/verify', 
  authMiddleware.verifyToken,
  authController.verifyToken
);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (client-side token removal)
 * @access  Private
 */
router.post('/logout', 
  authMiddleware.verifyToken,
  authController.logout
);

/**
 * @route   GET /api/auth/interviewers
 * @desc    Get all active interviewers
 * @access  Private (HR and Interviewer)
 */
router.get('/interviewers',
  authMiddleware.verifyToken,
  authMiddleware.requireHROrInterviewer,
  authController.getInterviewers
);

/**
 * @route   GET /api/auth/linkedin/auth
 * @desc    Start LinkedIn OAuth flow
 * @access  Private
 */
router.get('/linkedin/auth',
  authMiddleware.verifyToken,
  authController.startLinkedInAuth
);

/**
 * @route   GET /api/auth/linkedin/callback
 * @desc    Handle LinkedIn OAuth callback
 * @access  Public
 */
router.get('/linkedin/callback',
  authController.handleLinkedInCallback
);

/**
 * @route   GET /api/auth/linkedin/status
 * @desc    Get LinkedIn connection status
 * @access  Private
 */
router.get('/linkedin/status',
  authMiddleware.verifyToken,
  authController.getLinkedInStatus
);

/**
 * @route   DELETE /api/auth/linkedin/disconnect
 * @desc    Disconnect LinkedIn account
 * @access  Private
 */
router.delete('/linkedin/disconnect',
  authMiddleware.verifyToken,
  authController.disconnectLinkedIn
);

// Role-specific routes examples
/**
 * @route   GET /api/auth/hr-only
 * @desc    HR only endpoint example
 * @access  Private (HR only)
 */
router.get('/hr-only', 
  authMiddleware.verifyToken,
  authMiddleware.requireHR,
  (req, res) => {
    res.json({
      success: true,
      message: 'This is an HR-only endpoint',
      user: req.user
    });
  }
);

/**
 * @route   GET /api/auth/interviewer-only
 * @desc    Interviewer only endpoint example
 * @access  Private (Interviewer only)
 */
router.get('/interviewer-only', 
  authMiddleware.verifyToken,
  authMiddleware.requireInterviewer,
  (req, res) => {
    res.json({
      success: true,
      message: 'This is an interviewer-only endpoint',
      user: req.user
    });
  }
);

/**
 * @route   GET /api/auth/staff-only
 * @desc    HR or Interviewer endpoint example
 * @access  Private (HR or Interviewer)
 */
router.get('/staff-only', 
  authMiddleware.verifyToken,
  authMiddleware.requireHROrInterviewer,
  (req, res) => {
    res.json({
      success: true,
      message: 'This endpoint is accessible by HR and Interviewers',
      user: req.user
    });
  }
);

module.exports = router;
