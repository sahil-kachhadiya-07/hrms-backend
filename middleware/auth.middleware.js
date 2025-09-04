const authService = require('../services/auth.service');

const authMiddleware = {
  // Verify JWT token middleware
  verifyToken: async (req, res, next) => {
    try {
      // Get token from header
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          message: 'Access denied. No token provided or invalid format.'
        });
      }

      // Extract token
      const token = authHeader.substring(7); // Remove 'Bearer ' prefix

      // Verify token and get user data
      const user = await authService.verifyUserToken(token);
      
      // Add user to request object
      req.user = user;
      
      next();
    } catch (error) {
      console.error('Auth Middleware Error:', error.message);
      
      return res.status(401).json({
        success: false,
        message: 'Access denied. Invalid or expired token.'
      });
    }
  },

  // Role-based access control middleware
  requireRole: (...allowedRoles) => {
    return (req, res, next) => {
      try {
        if (!req.user) {
          return res.status(401).json({
            success: false,
            message: 'Access denied. Authentication required.'
          });
        }

        const userRole = req.user.role;
        
        if (!allowedRoles.includes(userRole)) {
          return res.status(403).json({
            success: false,
            message: `Access denied. Required role(s): ${allowedRoles.join(', ')}`
          });
        }

        next();
      } catch (error) {
        console.error('Role Middleware Error:', error.message);
        
        return res.status(500).json({
          success: false,
          message: 'Authorization check failed'
        });
      }
    };
  },

  // HR only access
  requireHR: (req, res, next) => {
    return authMiddleware.requireRole('hr')(req, res, next);
  },

  // Interviewer only access
  requireInterviewer: (req, res, next) => {
    return authMiddleware.requireRole('interviewer')(req, res, next);
  },

  // HR or Interviewer access
  requireHROrInterviewer: (req, res, next) => {
    return authMiddleware.requireRole('hr', 'interviewer')(req, res, next);
  },

  // Optional authentication middleware (doesn't fail if no token)
  optionalAuth: async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const user = await authService.verifyUserToken(token);
        req.user = user;
      }
      
      next();
    } catch (error) {
      // Don't fail, just continue without user
      next();
    }
  }
};

module.exports = authMiddleware;
