const { body } = require('express-validator');

const validationMiddleware = {
  // Sign up validation
  validateSignUp: [
    body('username')
      .trim()
      .isLength({ min: 3, max: 30 })
      .withMessage('Username must be between 3 and 30 characters')
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('Username can only contain letters, numbers, and underscores')
      .toLowerCase(),

    body('email')
      .trim()
      .isEmail()
      .withMessage('Please provide a valid email address')
      .normalizeEmail()
      .toLowerCase(),

    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),

    body('role')
      .trim()
      .isIn(['hr', 'interviewer'])
      .withMessage('Role must be either hr or interviewer')
      .toLowerCase()
  ],

  // Sign in validation
  validateSignIn: [
    body('email')
      .trim()
      .isEmail()
      .withMessage('Please provide a valid email address')
      .normalizeEmail()
      .toLowerCase(),

    body('password')
      .notEmpty()
      .withMessage('Password is required')
  ],

  // Update profile validation
  validateUpdateProfile: [
    body('username')
      .optional()
      .trim()
      .isLength({ min: 3, max: 30 })
      .withMessage('Username must be between 3 and 30 characters')
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('Username can only contain letters, numbers, and underscores')
      .toLowerCase(),

    body('email')
      .optional()
      .trim()
      .isEmail()
      .withMessage('Please provide a valid email address')
      .normalizeEmail()
      .toLowerCase()
  ],

  // Change password validation
  validateChangePassword: [
    body('currentPassword')
      .notEmpty()
      .withMessage('Current password is required'),

    body('newPassword')
      .isLength({ min: 6 })
      .withMessage('New password must be at least 6 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number'),

    body('confirmPassword')
      .custom((value, { req }) => {
        if (value !== req.body.newPassword) {
          throw new Error('Password confirmation does not match new password');
        }
        return true;
      })
  ],

  // Job validation
  validateCreateJob: [
    body('title')
      .trim()
      .isLength({ min: 3, max: 200 })
      .withMessage('Job title must be between 3 and 200 characters')
      .notEmpty()
      .withMessage('Job title is required'),

    body('description')
      .trim()
      .isLength({ min: 10, max: 5000 })
      .withMessage('Job description must be between 10 and 5000 characters')
      .notEmpty()
      .withMessage('Job description is required'),

    body('interviewer')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Interviewer name must be between 2 and 100 characters')
      .notEmpty()
      .withMessage('Interviewer is required')
  ],

  // Update job validation
  validateUpdateJob: [
    body('title')
      .optional()
      .trim()
      .isLength({ min: 3, max: 200 })
      .withMessage('Job title must be between 3 and 200 characters'),

    body('description')
      .optional()
      .trim()
      .isLength({ min: 10, max: 5000 })
      .withMessage('Job description must be between 10 and 5000 characters'),

    body('interviewer')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Interviewer name must be between 2 and 100 characters'),

    body('status')
      .optional()
      .isIn(['draft', 'published', 'closed'])
      .withMessage('Status must be either draft, published, or closed')
  ],

  // Job post generation validation
  validateGenerateJobPost: [
    body('content')
      .optional()
      .trim()
      .isLength({ min: 10, max: 10000 })
      .withMessage('Job post content must be between 10 and 10000 characters'),

    body('useAI')
      .optional()
      .isBoolean()
      .withMessage('useAI must be a boolean value'),

    body('includeImage')
      .optional()
      .isBoolean()
      .withMessage('includeImage must be a boolean value'),

    body('companyInfo')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Company info cannot exceed 1000 characters')
  ],

  // Publish job post validation
  validatePublishJobPost: [
    body('platforms')
      .isArray({ min: 1 })
      .withMessage('At least one platform must be selected'),

    body('platforms.*')
      .isIn(['linkedin', 'twitter', 'facebook', 'indeed', 'glassdoor'])
      .withMessage('Invalid platform selected')
  ]
};

module.exports = validationMiddleware;
