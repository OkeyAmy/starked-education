# User Role Management System (RBAC)

This document describes the implementation of the Role-Based Access Control (RBAC) system for the StarkEd Education Platform.

## Overview

The RBAC system provides three user roles with granular permission control:
- **Student**: Basic access to courses, quizzes, and content
- **Educator**: Can create and manage courses, quizzes, and content
- **Admin**: Full system access with administrative capabilities

## Implementation Details

### Files Created/Modified

#### 1. Models (`backend/src/models/User.ts`)
- Added `UserRole` enum with three roles: `STUDENT`, `EDUCATOR`, `ADMIN`
- Added `role` field to `UserProfile` interface

#### 2. Utils (`backend/src/utils/roles.js`)
- Role hierarchy system for permission checking
- Permission constants for different resources
- Role-to-permission mapping
- Utility functions for permission validation

#### 3. Middleware (`backend/src/middleware/auth.js`)
- `authenticateToken`: JWT authentication middleware
- `requireRole`: Role-based access control
- `requirePermission`: Permission-based access control
- `requireMinimumRole`: Minimum role level checking
- `requireSelfOrAdmin`: Self-resource or admin access
- Predefined middleware: `requireEducatorOrAdmin`, `requireAdmin`, `requireStudentOrAbove`

#### 4. Permissions (`backend/src/middleware/permissions.js`)
- Resource-specific permission checkers
- Ownership validation middleware
- Action-based permission controls
- Specialized middleware for courses, quizzes, users, and content

#### 5. Routes (`backend/src/routes/auth.js`)
- User registration with role assignment
- Login system with JWT tokens
- Profile management
- **Admin-only role assignment endpoints**
- User management (list, delete) for admins

#### 6. Admin Routes (`backend/src/routes/admin.js`)
- Dashboard statistics
- System logs access
- User activity reports
- Course performance reports
- System settings management
- Backup functionality
- System announcements

#### 7. Database Migration (`backend/migrations/002_add_user_roles.js`)
- Adds `role` column to users table
- Creates role_permissions table
- Creates role_change_log audit table
- Adds appropriate indexes and constraints
- Inserts default permissions for all roles

## Role Permissions

### Student Permissions
- `course:read` - View courses
- `quiz:read` - Take quizzes
- `content:read` - Access educational content
- `user:read` - View own profile

### Educator Permissions
All student permissions plus:
- `course:create`, `course:update` - Create and edit courses
- `quiz:create`, `quiz:update`, `quiz:delete` - Full quiz management
- `content:create`, `content:update`, `content:delete` - Content management

### Admin Permissions
All educator permissions plus:
- `course:delete` - Delete courses
- `user:update`, `user:delete`, `user:assign_role` - User management
- `admin:panel`, `system:manage` - System administration

## API Endpoints

### Authentication Routes (`/api/auth`)
- `POST /register` - User registration (defaults to student role)
- `POST /login` - User login
- `GET /profile` - Get current user profile
- `PUT /profile` - Update user profile
- `PUT /assign-role/:userId` - **Admin only** - Assign role to user
- `GET /users` - **Admin only** - List all users
- `DELETE /users/:userId` - **Admin only** - Delete user

### Admin Routes (`/api/admin`)
- `GET /dashboard` - Dashboard statistics
- `GET /logs` - System logs
- `GET /reports/user-activity` - User activity reports
- `GET /reports/course-performance` - Course performance reports
- `GET /settings` - System settings
- `PUT /settings` - Update system settings
- `POST /backup` - Create system backup
- `GET /backups` - List backups
- `POST /announcements` - Send system announcement

## Usage Examples

### Protecting Routes with Middleware

```javascript
const { authenticateToken, requireEducatorOrAdmin, requirePermission } = require('../middleware/auth');
const { canManageCourse } = require('../middleware/permissions');
const { PERMISSIONS } = require('../utils/roles');

// Only educators and admins can create courses
router.post('/courses', authenticateToken, requireEducatorOrAdmin, createCourse);

// Only users with course:create permission can access
router.post('/courses', authenticateToken, requirePermission(PERMISSIONS.COURSE_CREATE), createCourse);

// Course-specific permission checking
router.put('/courses/:id', authenticateToken, canManageCourse, updateCourse);
```

### Role Assignment (Admin Only)

```javascript
// Assign educator role to a user
PUT /api/auth/assign-role/123
{
  "role": "educator"
}

// Response
{
  "message": "Role assigned successfully",
  "user": {
    "id": "123",
    "username": "johndoe",
    "email": "john@example.com",
    "oldRole": "student",
    "newRole": "educator",
    "updatedAt": "2024-01-01T12:00:00.000Z"
  }
}
```

### Permission Checking

```javascript
const { hasPermission, canPerformAction } = require('../utils/roles');

// Check if user has specific permission
if (hasPermission('educator', 'course:create')) {
  // Allow course creation
}

// Check if user can perform action on resource
if (canPerformAction('student', 'read', 'course')) {
  // Allow course reading
}
```

## Database Schema

### Users Table
```sql
ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'student';
ALTER TABLE users ADD CONSTRAINT chk_user_role 
  CHECK (role IN ('student', 'educator', 'admin'));
```

### Role Permissions Table
```sql
CREATE TABLE role_permissions (
  id SERIAL PRIMARY KEY,
  role VARCHAR(20) NOT NULL,
  permission VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(role, permission)
);
```

### Role Change Log Table
```sql
CREATE TABLE role_change_log (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  changed_by VARCHAR(255) NOT NULL,
  old_role VARCHAR(20),
  new_role VARCHAR(20) NOT NULL,
  change_reason TEXT,
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ip_address INET,
  user_agent TEXT
);
```

## Security Features

1. **JWT Authentication**: Secure token-based authentication
2. **Role Hierarchy**: Prevents privilege escalation
3. **Permission Granularity**: Fine-grained access control
4. **Audit Logging**: Tracks all role changes
5. **Input Validation**: Validates all role assignments
6. **Ownership Checks**: Users can only modify their own resources

## Migration

To apply the database migration:

```bash
# Run the migration
node -e "require('./migrations/002_add_user_roles.js').up(pool)"

# Validate the migration
node -e "require('./migrations/002_add_user_roles.js').validate(pool)"

# Rollback if needed
node -e "require('./migrations/002_add_user_roles.js').down(pool)"
```

## Testing

The system includes comprehensive error handling and validation:

- Invalid role assignments are rejected
- Unauthorized access attempts are logged
- Missing or invalid tokens are handled gracefully
- Database constraints ensure data integrity

## Future Enhancements

1. **Dynamic Permissions**: Allow runtime permission modifications
2. **Role Inheritance**: Support for complex role hierarchies
3. **Resource Scoping**: Context-aware permissions
4. **Multi-tenancy**: Support for organization-based roles
5. **Permission Caching**: Improve performance with Redis caching

## Acceptance Criteria Met

✅ **Three roles**: student, educator, admin  
✅ **Middleware functions** for role checking  
✅ **Database migration** for role fields  
✅ **API endpoints** for role management (admin only)  
✅ **Proper permission handling** throughout the system  

The implementation provides a complete, secure, and scalable role-based access control system that meets all specified requirements.
