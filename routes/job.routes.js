const express = require('express');
const jobController = require('../controllers/job.controller');
const authMiddleware = require('../middleware/auth.middleware');
const validationMiddleware = require('../middleware/validation.middleware');

const router = express.Router();

// All job routes require authentication
router.use(authMiddleware.verifyToken);

/**
 * @route   POST /api/jobs
 * @desc    Create a new job
 * @access  Private (HR and Interviewer)
 */
router.post('/',
  authMiddleware.requireHROrInterviewer,
  validationMiddleware.validateCreateJob,
  jobController.createJob
);

/**
 * @route   GET /api/jobs
 * @desc    Get all jobs for authenticated user
 * @access  Private (HR and Interviewer)
 */
router.get('/',
  authMiddleware.requireHROrInterviewer,
  jobController.getJobs
);

/**
 * @route   GET /api/jobs/stats
 * @desc    Get job statistics for authenticated user
 * @access  Private (HR and Interviewer)
 */
router.get('/stats',
  authMiddleware.requireHROrInterviewer,
  jobController.getJobStats
);

/**
 * @route   GET /api/jobs/:id
 * @desc    Get specific job by ID
 * @access  Private (HR and Interviewer)
 */
router.get('/:id',
  authMiddleware.requireHROrInterviewer,
  jobController.getJobById
);

/**
 * @route   PUT /api/jobs/:id
 * @desc    Update a job
 * @access  Private (HR and Interviewer)
 */
router.put('/:id',
  authMiddleware.requireHROrInterviewer,
  validationMiddleware.validateUpdateJob,
  jobController.updateJob
);

/**
 * @route   DELETE /api/jobs/:id
 * @desc    Delete a job (soft delete)
 * @access  Private (HR and Interviewer)
 */
router.delete('/:id',
  authMiddleware.requireHROrInterviewer,
  jobController.deleteJob
);

/**
 * @route   POST /api/jobs/:id/job-post
 * @desc    Generate job post content
 * @access  Private (HR and Interviewer)
 */
router.post('/:id/job-post',
  authMiddleware.requireHROrInterviewer,
  validationMiddleware.validateGenerateJobPost,
  jobController.generateJobPost
);

/**
 * @route   POST /api/jobs/:id/publish
 * @desc    Publish job post to platforms
 * @access  Private (HR and Interviewer)
 */
router.post('/:id/publish',
  authMiddleware.requireHROrInterviewer,
  validationMiddleware.validatePublishJobPost,
  jobController.publishJobPost
);

/**
 * @route   POST /api/jobs/:id/applications
 * @desc    Increment applications count
 * @access  Private (HR and Interviewer)
 */
router.post('/:id/applications',
  authMiddleware.requireHROrInterviewer,
  jobController.incrementApplications
);

// HR-only routes (for future use)
/**
 * @route   GET /api/jobs/hr/all
 * @desc    Get all jobs from all users (HR only)
 * @access  Private (HR only)
 */
router.get('/hr/all',
  authMiddleware.requireHR,
  (req, res) => {
    res.json({
      success: true,
      message: 'HR-only endpoint for all jobs (not implemented yet)',
      data: []
    });
  }
);

/**
 * @route   GET /api/jobs/hr/analytics
 * @desc    Get job analytics across all users (HR only)
 * @access  Private (HR only)
 */
router.get('/hr/analytics',
  authMiddleware.requireHR,
  (req, res) => {
    res.json({
      success: true,
      message: 'HR-only endpoint for job analytics (not implemented yet)',
      data: {}
    });
  }
);

module.exports = router;
