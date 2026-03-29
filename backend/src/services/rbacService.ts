import { UserRole, ROLE_PERMISSIONS, ROLE_HIERARCHY } from '../utils/roles';
import { clearCachedPermissions } from '../utils/redis';
import logger from '../utils/logger';

/**
 * RBAC Service to manage roles and permissions
 */
class RBACService {
  /**
   * Assign a role to a user
   * @param adminId - ID of the admin performing the action
   * @param userId - ID of the user to assign the role to
   * @param newRole - The role to assign
   * @returns - The update results
   */
  async assignRole(adminId: string, userId: string, newRole: string): Promise<any> {
    try {
      if (!Object.values(UserRole).includes(newRole as any)) {
        throw new Error(`Invalid role: ${newRole}`);
      }

      // 1. Update user in database (Mocked for now)
      logger.info(`RBAC: User ${adminId} assigned role ${newRole} to user ${userId}`);
      
      // 2. Clear permission cache to ensure immediate effect
      await clearCachedPermissions(userId);

      // 3. Log to Audit (Mocked for now)
      await this.logPermissionChange(adminId, userId, 'role_assignment', {
        newRole,
        timestamp: new Date().toISOString()
      });

      return { userId, role: newRole, success: true };
    } catch (err) {
      logger.error(`Error assigning role: ${err}`);
      throw err;
    }
  }

  /**
   * Get all available roles
   */
  getAvailableRoles(): string[] {
    return Object.values(UserRole);
  }

  /**
   * Check if a user can assign a specific role (Level protection)
   */
  canAssignRole(adminRole: string, targetRole: string): boolean {
    const adminLevel = ROLE_HIERARCHY[adminRole] || 0;
    const targetLevel = ROLE_HIERARCHY[targetRole] || 0;
    
    // Only admins can assign other admin/moderator roles
    return adminLevel > targetLevel || adminRole === UserRole.ADMIN;
  }

  /**
   * Log permission changes for audit purposes
   */
  async logPermissionChange(executorId: string, targetId: string, action: string, details: any): Promise<void> {
    const logEntry = {
      executorId,
      targetId,
      action,
      details,
      timestamp: new Date().toISOString()
    };
    
    logger.info(`[AUDIT] Permission Change: ${JSON.stringify(logEntry)}`);
  }
}

export default new RBACService();
