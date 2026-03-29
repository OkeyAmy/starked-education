const { canPerformAction, hasPermission, UserRole } = require('../utils/roles');

/**
 * Check if user can perform specific action on resource
 * @param {string} action - Action to perform (create, read, update, delete)
 * @param {string} resource - Resource type (course, quiz, user, etc.)
 * @returns {Function} Middleware function
 */
const checkActionPermission = (action, resource) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Please authenticate to access this resource'
      });
    }

    const userRole = req.user.role;
    
    if (!canPerformAction(userRole, action, resource)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        message: `You don't have permission to ${action} ${resource}`
      });
    }

    next();
  };
};

/**
 * Resource ownership checker - users can only modify their own resources
 * @param {string} resourceType - Type of resource
 * @param {string} resourceIdParam - Parameter containing resource ID
 * @returns {Function} Middleware function
 */
const checkResourceOwnership = (resourceType, resourceIdParam = 'id') => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required',
          message: 'Please authenticate to access this resource'
        });
      }

      const userRole = req.user.role;
      const resourceId = req.params[resourceIdParam];
      const userId = req.user.id || req.user.sub;

      // Admins can access any resource
      if (userRole === UserRole.ADMIN) {
        return next();
      }

      // For non-admin users, check ownership
      // This would typically involve a database query to verify ownership
      // For now, we'll implement a basic check that can be extended
      const resource = await getResourceById(resourceType, resourceId);
      
      if (!resource) {
        return res.status(404).json({
          error: 'Resource not found',
          message: `${resourceType} with ID ${resourceId} not found`
        });
      }

      if (resource.owner !== userId && resource.userId !== userId) {
        return res.status(403).json({
          error: 'Access denied',
          message: `You can only modify your own ${resourceType}`
        });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Error checking permissions'
      });
    }
  };
};

/**
 * Course-specific permission checker
 */
const canManageCourse = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'Please authenticate to access this resource'
    });
  }

  const userRole = req.user.role;
  const action = req.method.toLowerCase() === 'get' ? 'read' : 
                 req.method.toLowerCase() === 'post' ? 'create' :
                 req.method.toLowerCase() === 'put' ? 'update' : 'delete';

  if (!canPerformAction(userRole, action, 'course')) {
    return res.status(403).json({
      error: 'Insufficient permissions',
      message: `You don't have permission to ${action} courses`
    });
  }

  next();
};

/**
 * Quiz-specific permission checker
 */
const canManageQuiz = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'Please authenticate to access this resource'
    });
  }

  const userRole = req.user.role;
  const action = req.method.toLowerCase() === 'get' ? 'read' : 
                 req.method.toLowerCase() === 'post' ? 'create' :
                 req.method.toLowerCase() === 'put' ? 'update' : 'delete';

  if (!canPerformAction(userRole, action, 'quiz')) {
    return res.status(403).json({
      error: 'Insufficient permissions',
      message: `You don't have permission to ${action} quizzes`
    });
  }

  next();
};

/**
 * User management permission checker
 */
const canManageUser = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'Please authenticate to access this resource'
    });
  }

  const userRole = req.user.role;
  const targetUserId = req.params.userId || req.params.id;
  const currentUserId = req.user.id || req.user.sub;

  // Admins can manage any user
  if (userRole === UserRole.ADMIN) {
    return next();
  }

  // Users can only read their own profile
  if (req.method.toLowerCase() === 'get' && currentUserId === targetUserId) {
    return next();
  }

  // Users can update their own profile
  if (['put', 'patch'].includes(req.method.toLowerCase()) && currentUserId === targetUserId) {
    return next();
  }

  return res.status(403).json({
    error: 'Access denied',
    message: 'You can only access and modify your own user profile'
  });
};

/**
 * Content management permission checker
 */
const canManageContent = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'Please authenticate to access this resource'
    });
  }

  const userRole = req.user.role;
  const action = req.method.toLowerCase() === 'get' ? 'read' : 
                 req.method.toLowerCase() === 'post' ? 'create' :
                 req.method.toLowerCase() === 'put' ? 'update' : 'delete';

  if (!canPerformAction(userRole, action, 'content')) {
    return res.status(403).json({
      error: 'Insufficient permissions',
      message: `You don't have permission to ${action} content`
    });
  }

  next();
};

/**
 * Helper function to get resource by ID (placeholder - should be implemented with actual database queries)
 * @param {string} resourceType - Type of resource
 * @param {string} resourceId - Resource ID
 * @returns {Promise<Object|null>} - Resource object or null
 */
async function getResourceById(resourceType, resourceId) {
  // This is a placeholder implementation
  // In a real application, you would query your database here
  // For now, we'll return a mock object that passes ownership checks
  return {
    id: resourceId,
    owner: resourceId, // This would normally be the actual owner ID
    userId: resourceId // Alternative owner field
  };
}

module.exports = {
  checkActionPermission,
  checkResourceOwnership,
  canManageCourse,
  canManageQuiz,
  canManageUser,
  canManageContent
};
