const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { authenticateToken, requireAdmin, requirePermission } = require('../middleware/auth');
const { UserRole, PERMISSIONS } = require('../utils/roles');
const { authLimiter, readLimiter, moderateLimiter } = require('../middleware/rateLimiter');
const securityService = require('../services/securityService');
const Joi = require('joi');
const { validateRequestSchema } = require('../middleware/validateRequestSchema');
const router = express.Router();

const registerSchema = {
  body: Joi.object({
    username: Joi.string().trim().min(3).max(50).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).max(128).required(),
    role: Joi.string().valid('student', 'educator', 'admin').optional(),
  })
};

const loginSchema = {
  body: Joi.object({
    username: Joi.string().required(),
    password: Joi.string().required(),
  })
};

const updateProfileSchema = {
  body: Joi.object({
    username: Joi.string().trim().min(3).max(50).optional(),
    email: Joi.string().email().optional(),
    currentPassword: Joi.string().optional(),
    newPassword: Joi.string().min(8).max(128).optional(),
  }).min(1)
};

const assignRoleSchema = {
  params: Joi.object({
    userId: Joi.string().trim().min(1).required(),
  }),
  body: Joi.object({
    role: Joi.string().valid('student', 'educator', 'admin').required(),
  })
};

// Mock user database - replace with actual database implementation
const users = new Map();

/**
 * Generate JWT token
 * @param {Object} user - User object
 * @returns {string} - JWT token
 */
function generateToken(user) {
  return jwt.sign(
    { 
      id: user.id, 
      username: user.username, 
      role: user.role,
      email: user.email 
    },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '24h' }
  );
}

/**
 * Register new user
 * POST /api/auth/register
 */
router.post('/register', authLimiter, validateRequestSchema(registerSchema), async (req, res) => {
  try {
    const { username, email, password, role = UserRole.STUDENT } = req.body;

    // Check if user already exists
    const existingUser = Array.from(users.values()).find(
      user => user.username === username || user.email === email
    );

    if (existingUser) {
      await securityService.logSecurityEvent(req.ip, 'auth_conflict', { username, email });
      return res.status(409).json({
        success: false,
        error: 'User already exists',
        message: 'A user with this username or email already exists'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = {
      id: Date.now().toString(),
      username,
      email,
      password: hashedPassword,
      role,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    users.set(newUser.id, newUser);

    // Generate token
    const token = generateToken(newUser);

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        createdAt: newUser.createdAt
      },
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Error during user registration'
    });
  }
});

/**
 * User login
 * POST /api/auth/login
 */
router.post('/login', authLimiter, validateRequestSchema(loginSchema), async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find user by username or email
    const user = Array.from(users.values()).find(
      u => u.username === username || u.email === username
    );

    if (!user) {
      await securityService.logSecurityEvent(req.ip, 'auth_failure', { username, reason: 'user_not_found' });
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Invalid username or password'
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      await securityService.logSecurityEvent(req.ip, 'auth_failure', { username, reason: 'invalid_password' });
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Invalid username or password'
      });
    }

    // Generate token
    const token = generateToken(user);

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Error during login'
    });
  }
});

/**
 * Get current user profile
 * GET /api/auth/profile
 */
router.get('/profile', readLimiter, authenticateToken, (req, res) => {
  const user = users.get(req.user.id);
  
  if (!user) {
    return res.status(404).json({
      error: 'User not found',
      message: 'User profile not found'
    });
  }

  res.json({
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }
  });
});

/**
 * Update user profile
 * PUT /api/auth/profile
 */
router.put('/profile', moderateLimiter, authenticateToken, validateRequestSchema(updateProfileSchema), async (req, res) => {
  try {
    const { username, email, currentPassword, newPassword } = req.body;
    const user = users.get(req.user.id);

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User profile not found'
      });
    }

    // Check if changing password
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({
          error: 'Current password required',
          message: 'Current password is required to change password'
        });
      }

      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidPassword) {
        return res.status(401).json({
          error: 'Invalid current password',
          message: 'The current password provided is incorrect'
        });
      }

      user.password = await bcrypt.hash(newPassword, 10);
    }

    // Update other fields
    if (username && username !== user.username) {
      // Check if username is already taken
      const existingUser = Array.from(users.values()).find(
        u => u.username === username && u.id !== user.id
      );
      
      if (existingUser) {
        return res.status(409).json({
          error: 'Username taken',
          message: 'This username is already taken'
        });
      }
      
      user.username = username;
    }

    if (email && email !== user.email) {
      // Check if email is already taken
      const existingUser = Array.from(users.values()).find(
        u => u.email === email && u.id !== user.id
      );
      
      if (existingUser) {
        return res.status(409).json({
          error: 'Email taken',
          message: 'This email is already registered'
        });
      }
      
      user.email = email;
    }

    user.updatedAt = new Date().toISOString();

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        updatedAt: user.updatedAt
      }
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Error updating profile'
    });
  }
});

/**
 * Assign role to user (Admin only)
 * PUT /api/auth/assign-role/:userId
 */
router.put('/assign-role/:userId', 
  moderateLimiter,
  authenticateToken, 
  requireAdmin, 
  requirePermission(PERMISSIONS.USER_ASSIGN_ROLE),
  validateRequestSchema(assignRoleSchema),
  (req, res) => {
    try {
      const { role } = req.body;
      const { userId } = req.params;

      const user = users.get(userId);
      
      if (!user) {
        return res.status(404).json({
          error: 'User not found',
          message: 'User with the specified ID not found'
        });
      }

      const oldRole = user.role;
      user.role = role;
      user.updatedAt = new Date().toISOString();

      res.json({
        message: 'Role assigned successfully',
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          oldRole,
          newRole: user.role,
          updatedAt: user.updatedAt
        }
      });
    } catch (error) {
      console.error('Role assignment error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Error assigning role'
      });
    }
  }
);

/**
 * Get all users (Admin only)
 * GET /api/auth/users
 */
router.get('/users', 
  readLimiter,
  authenticateToken, 
  requireAdmin, 
  requirePermission(PERMISSIONS.USER_READ),
  (req, res) => {
    try {
      const { page = 1, limit = 10, role } = req.query;
      const offset = (page - 1) * limit;

      let allUsers = Array.from(users.values());

      // Filter by role if specified
      if (role) {
        allUsers = allUsers.filter(user => user.role === role);
      }

      // Remove password from response
      const usersWithoutPassword = allUsers.map(user => ({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }));

      // Pagination
      const paginatedUsers = usersWithoutPassword.slice(offset, offset + parseInt(limit));

      res.json({
        users: paginatedUsers,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: usersWithoutPassword.length,
          pages: Math.ceil(usersWithoutPassword.length / limit)
        }
      });
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Error retrieving users'
      });
    }
  }
);

/**
 * Delete user (Admin only)
 * DELETE /api/auth/users/:userId
 */
router.delete('/users/:userId', 
  moderateLimiter,
  authenticateToken, 
  requireAdmin, 
  requirePermission(PERMISSIONS.USER_DELETE),
  (req, res) => {
    try {
      const { userId } = req.params;
      const user = users.get(userId);

      if (!user) {
        return res.status(404).json({
          error: 'User not found',
          message: 'User with the specified ID not found'
        });
      }

      // Prevent admin from deleting themselves
      if (userId === req.user.id) {
        return res.status(400).json({
          error: 'Cannot delete self',
          message: 'Administrators cannot delete their own accounts'
        });
      }

      users.delete(userId);

      res.json({
        message: 'User deleted successfully',
        deletedUser: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        }
      });
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Error deleting user'
      });
    }
  }
);

module.exports = router;
