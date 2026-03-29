import { Request, Response, NextFunction } from 'express';
import { hasPermission, hasRoleLevel, ROLE_HIERARCHY, getRolePermissions } from '../utils/roles';
import logger from '../utils/logger';
import { getCachedPermissions, cachePermissions } from '../utils/redis';

// Define User interface to include role and id
interface User {
  id: string;
  role: string;
}

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

/**
 * Middleware to check if user has a specific permission
 * @param permission - Permission string (e.g., 'course:create')
 */
export const requirePermission = (permission: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      if (!user || !user.role || !user.id) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized: User authentication required'
        });
      }

      // 1. Try Cache First
      let userPermissions = await getCachedPermissions(user.id);

      // 2. Fallback to calculating permissions if not in cache
      if (!userPermissions) {
        userPermissions = getRolePermissions(user.role);
        // Cache it for subsequent requests
        await cachePermissions(user.id, userPermissions);
      }

      const hasPerm = userPermissions.includes(permission);
      if (!hasPerm) {
        logger.warn(`Permission Denied: User ${user.id} (${user.role}) attempted to access ${permission} on ${req.method} ${req.path}`);
        return res.status(403).json({
          success: false,
          message: `Forbidden: Resource access denied. Required: ${permission}`,
          code: 'PERMISSION_DENIED'
        });
      }

      next();
    } catch (err) {
      logger.error(`RBAC Permission Check Error: ${err}`);
      res.status(500).json({
        success: false,
        message: 'Internal server error during permission check'
      });
    }
  };
};

/**
 * Role escalation protection middleware
 * Prevents assigning a role higher than one's own role level
 */
export const protectRoleEscalation = (req: Request, res: Response, next: NextFunction) => {
  const admin = req.user;
  const targetRole = req.body.role;

  if (!admin || !targetRole) return next();

  const adminLevel = ROLE_HIERARCHY[admin.role] || 0;
  const targetLevel = ROLE_HIERARCHY[targetRole] || 0;

  if (targetLevel >= adminLevel && admin.role !== 'admin') {
    logger.error(`Privilege Escalation Attempt: User ${admin.id} (${admin.role}) tried to assign ${targetRole}`);
    return res.status(403).json({
      success: false,
      message: 'Forbidden: You cannot assign a role higher or equal to your own',
      code: 'PRIVILEGE_ESCALATION_DETECTED'
    });
  }
  next();
};

/**
 * Middleware to require a specific role level
 */
export const requireRoleLevel = (requiredRole: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !hasRoleLevel(req.user.role, requiredRole)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Minimum role ${requiredRole} required`
      });
    }
    next();
  };
};
