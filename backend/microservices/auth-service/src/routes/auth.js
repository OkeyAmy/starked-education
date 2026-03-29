/**
 * Authentication Routes
 * Handles login, registration, password reset, and token management
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const { 
    createUser, 
    findUserByEmail, 
    findUserById, 
    updateUserPassword,
    createPasswordResetToken,
    findPasswordResetToken,
    deletePasswordResetToken,
    updateLastLogin
} = require('../models/user');
const { 
    createSession, 
    findSession, 
    deleteSession, 
    deleteAllUserSessions 
} = require('../models/session');
const { 
    createRefreshToken, 
    findRefreshToken, 
    deleteRefreshToken,
    deleteAllUserRefreshTokens 
} = require('../models/refreshToken');
const { 
    trackAuthEvent,
    trackSecurityEvent 
} = require('../utils/audit');
const { 
    sendVerificationEmail,
    sendPasswordResetEmail 
} = require('../utils/email');
const { 
    generateTokens,
    verifyRefreshToken,
    blacklistToken 
} = require('../utils/jwt');
const { 
    rateLimiter,
    authRateLimiter,
    passwordResetRateLimiter 
} = require('../middleware/rateLimiter');
const { 
    validateRequest,
    sanitizeInput 
} = require('../middleware/validation');
const { 
    authenticateToken,
    requirePermission 
} = require('../middleware/auth');

const router = express.Router();

// Rate limiting
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 requests per windowMs
    message: 'Too many login attempts, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});

const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // limit each IP to 3 registration requests per hour
    message: 'Too many registration attempts, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * @route POST /api/v1/auth/register
 * @desc Register a new user
 * @access Public
 */
router.post('/register', 
    registerLimiter,
    [
        body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
        body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long'),
        body('firstName').trim().isLength({ min: 1 }).withMessage('First name is required'),
        body('lastName').trim().isLength({ min: 1 }).withMessage('Last name is required'),
        body('role').optional().isIn(['student', 'instructor', 'admin']).withMessage('Invalid role')
    ],
    validateRequest,
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    error: {
                        message: 'Validation failed',
                        details: errors.array(),
                        code: 'VALIDATION_ERROR'
                    }
                });
            }

            const { email, password, firstName, lastName, role = 'student' } = req.body;

            // Check if user already exists
            const existingUser = await findUserByEmail(email);
            if (existingUser) {
                return res.status(409).json({
                    error: {
                        message: 'User with this email already exists',
                        code: 'USER_EXISTS'
                    }
                });
            }

            // Hash password
            const salt = await bcrypt.genSalt(12);
            const hashedPassword = await bcrypt.hash(password, salt);

            // Create user
            const user = await createUser({
                email,
                password: hashedPassword,
                firstName,
                lastName,
                role,
                emailVerified: false,
                createdAt: new Date(),
                lastLogin: null
            });

            // Generate verification token
            const verificationToken = crypto.randomBytes(32).toString('hex');
            await createPasswordResetToken({
                userId: user.id,
                token: verificationToken,
                type: 'email_verification',
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
                createdAt: new Date()
            });

            // Send verification email
            await sendVerificationEmail(email, verificationToken);

            // Track registration event
            await trackAuthEvent('user_registered', {
                userId: user.id,
                email,
                role,
                ip: req.ip,
                userAgent: req.headers['user-agent']
            });

            res.status(201).json({
                message: 'User registered successfully. Please check your email to verify your account.',
                user: {
                    id: user.id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    role: user.role,
                    emailVerified: user.emailVerified,
                    createdAt: user.createdAt
                }
            });

        } catch (error) {
            console.error('Registration error:', error);
            
            await trackSecurityEvent('registration_failed', {
                email: req.body.email,
                ip: req.ip,
                error: error.message
            });

            res.status(500).json({
                error: {
                    message: 'Registration failed',
                    code: 'REGISTRATION_ERROR'
                }
            });
        }
    }
);

/**
 * @route POST /api/v1/auth/login
 * @desc Login user and return JWT tokens
 * @access Public
 */
router.post('/login',
    loginLimiter,
    [
        body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
        body('password').notEmpty().withMessage('Password is required')
    ],
    validateRequest,
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    error: {
                        message: 'Validation failed',
                        details: errors.array(),
                        code: 'VALIDATION_ERROR'
                    }
                });
            }

            const { email, password } = req.body;

            // Find user
            const user = await findUserByEmail(email);
            if (!user) {
                await trackSecurityEvent('login_failed_invalid_user', {
                    email,
                    ip: req.ip,
                    userAgent: req.headers['user-agent']
                });

                return res.status(401).json({
                    error: {
                        message: 'Invalid credentials',
                        code: 'INVALID_CREDENTIALS'
                    }
                });
            }

            // Check if email is verified
            if (!user.emailVerified) {
                return res.status(403).json({
                    error: {
                        message: 'Email not verified. Please check your email.',
                        code: 'EMAIL_NOT_VERIFIED'
                    }
                });
            }

            // Verify password
            const isPasswordValid = await bcrypt.compare(password, user.password);
            if (!isPasswordValid) {
                await trackSecurityEvent('login_failed_invalid_password', {
                    userId: user.id,
                    email,
                    ip: req.ip,
                    userAgent: req.headers['user-agent']
                });

                return res.status(401).json({
                    error: {
                        message: 'Invalid credentials',
                        code: 'INVALID_CREDENTIALS'
                    }
                });
            }

            // Generate tokens
            const { accessToken, refreshToken } = await generateTokens(user);

            // Create session
            const session = await createSession({
                userId: user.id,
                accessToken,
                refreshToken,
                ip: req.ip,
                userAgent: req.headers['user-agent'],
                createdAt: new Date(),
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
            });

            // Update last login
            await updateLastLogin(user.id, new Date());

            // Track successful login
            await trackAuthEvent('user_logged_in', {
                userId: user.id,
                email,
                ip: req.ip,
                userAgent: req.headers['user-agent'],
                sessionId: session.id
            });

            res.json({
                message: 'Login successful',
                tokens: {
                    accessToken,
                    refreshToken,
                    expiresIn: 3600 // 1 hour
                },
                user: {
                    id: user.id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    role: user.role,
                    lastLogin: user.lastLogin
                }
            });

        } catch (error) {
            console.error('Login error:', error);
            
            res.status(500).json({
                error: {
                    message: 'Login failed',
                    code: 'LOGIN_ERROR'
                }
            });
        }
    }
);

/**
 * @route POST /api/v1/auth/refresh
 * @desc Refresh access token using refresh token
 * @access Public
 */
router.post('/refresh',
    [
        body('refreshToken').notEmpty().withMessage('Refresh token is required')
    ],
    validateRequest,
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    error: {
                        message: 'Validation failed',
                        details: errors.array(),
                        code: 'VALIDATION_ERROR'
                    }
                });
            }

            const { refreshToken } = req.body;

            // Verify refresh token
            const tokenData = await verifyRefreshToken(refreshToken);
            if (!tokenData) {
                return res.status(401).json({
                    error: {
                        message: 'Invalid or expired refresh token',
                        code: 'INVALID_REFRESH_TOKEN'
                    }
                });
            }

            // Find refresh token in database
            const storedToken = await findRefreshToken(refreshToken);
            if (!storedToken) {
                return res.status(401).json({
                    error: {
                        message: 'Refresh token not found',
                        code: 'REFRESH_TOKEN_NOT_FOUND'
                    }
                });
            }

            // Get user
            const user = await findUserById(tokenData.userId);
            if (!user) {
                return res.status(401).json({
                    error: {
                        message: 'User not found',
                        code: 'USER_NOT_FOUND'
                    }
                });
            }

            // Generate new tokens
            const { accessToken, refreshToken: newRefreshToken } = await generateTokens(user);

            // Update session
            await deleteRefreshToken(refreshToken);
            await createRefreshToken({
                userId: user.id,
                token: newRefreshToken,
                ip: req.ip,
                userAgent: req.headers['user-agent'],
                createdAt: new Date(),
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
            });

            // Track token refresh
            await trackAuthEvent('token_refreshed', {
                userId: user.id,
                ip: req.ip,
                userAgent: req.headers['user-agent']
            });

            res.json({
                message: 'Token refreshed successfully',
                tokens: {
                    accessToken,
                    refreshToken: newRefreshToken,
                    expiresIn: 3600 // 1 hour
                }
            });

        } catch (error) {
            console.error('Token refresh error:', error);
            
            res.status(500).json({
                error: {
                    message: 'Token refresh failed',
                    code: 'TOKEN_REFRESH_ERROR'
                }
            });
        }
    }
);

/**
 * @route POST /api/v1/auth/logout
 * @desc Logout user and invalidate tokens
 * @access Private
 */
router.post('/logout',
    authenticateToken,
    async (req, res) => {
        try {
            const { refreshToken } = req.body;
            const userId = req.user.id;

            // Delete session and refresh token
            if (refreshToken) {
                await deleteRefreshToken(refreshToken);
            }
            await deleteAllUserSessions(userId);

            // Blacklist current access token
            await blacklistToken(req.token);

            // Track logout
            await trackAuthEvent('user_logged_out', {
                userId,
                ip: req.ip,
                userAgent: req.headers['user-agent']
            });

            res.json({
                message: 'Logout successful'
            });

        } catch (error) {
            console.error('Logout error:', error);
            
            res.status(500).json({
                error: {
                    message: 'Logout failed',
                    code: 'LOGOUT_ERROR'
                }
            });
        }
    }
);

/**
 * @route POST /api/v1/auth/forgot-password
 * @desc Send password reset email
 * @access Public
 */
router.post('/forgot-password',
    passwordResetRateLimiter,
    [
        body('email').isEmail().normalizeEmail().withMessage('Valid email is required')
    ],
    validateRequest,
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    error: {
                        message: 'Validation failed',
                        details: errors.array(),
                        code: 'VALIDATION_ERROR'
                    }
                });
            }

            const { email } = req.body;

            // Find user
            const user = await findUserByEmail(email);
            if (!user) {
                // Don't reveal that user doesn't exist
                return res.json({
                    message: 'If an account with that email exists, a password reset link has been sent.'
                });
            }

            // Generate reset token
            const resetToken = crypto.randomBytes(32).toString('hex');
            const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

            await createPasswordResetToken({
                userId: user.id,
                token: resetToken,
                type: 'password_reset',
                expiresAt,
                createdAt: new Date()
            });

            // Send reset email
            await sendPasswordResetEmail(email, resetToken);

            // Track password reset request
            await trackAuthEvent('password_reset_requested', {
                userId: user.id,
                email,
                ip: req.ip,
                userAgent: req.headers['user-agent']
            });

            res.json({
                message: 'If an account with that email exists, a password reset link has been sent.'
            });

        } catch (error) {
            console.error('Forgot password error:', error);
            
            res.status(500).json({
                error: {
                    message: 'Failed to process password reset request',
                    code: 'PASSWORD_RESET_ERROR'
                }
            });
        }
    }
);

/**
 * @route POST /api/v1/auth/reset-password
 * @desc Reset password using reset token
 * @access Public
 */
router.post('/reset-password',
    [
        body('token').notEmpty().withMessage('Reset token is required'),
        body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
    ],
    validateRequest,
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    error: {
                        message: 'Validation failed',
                        details: errors.array(),
                        code: 'VALIDATION_ERROR'
                    }
                });
            }

            const { token, password } = req.body;

            // Find reset token
            const resetToken = await findPasswordResetToken(token, 'password_reset');
            if (!resetToken) {
                return res.status(400).json({
                    error: {
                        message: 'Invalid or expired reset token',
                        code: 'INVALID_RESET_TOKEN'
                    }
                });
            }

            // Check if token is expired
            if (new Date() > resetToken.expiresAt) {
                await deletePasswordResetToken(token);
                return res.status(400).json({
                    error: {
                        message: 'Reset token has expired',
                        code: 'EXPIRED_RESET_TOKEN'
                    }
                });
            }

            // Hash new password
            const salt = await bcrypt.genSalt(12);
            const hashedPassword = await bcrypt.hash(password, salt);

            // Update user password
            await updateUserPassword(resetToken.userId, hashedPassword);

            // Delete reset token
            await deletePasswordResetToken(token);

            // Delete all user sessions (force logout from all devices)
            await deleteAllUserSessions(resetToken.userId);
            await deleteAllUserRefreshTokens(resetToken.userId);

            // Track password reset
            await trackAuthEvent('password_reset_completed', {
                userId: resetToken.userId,
                ip: req.ip,
                userAgent: req.headers['user-agent']
            });

            res.json({
                message: 'Password reset successful. Please login with your new password.'
            });

        } catch (error) {
            console.error('Reset password error:', error);
            
            res.status(500).json({
                error: {
                    message: 'Failed to reset password',
                    code: 'PASSWORD_RESET_ERROR'
                }
            });
        }
    }
);

/**
 * @route POST /api/v1/auth/verify-email
 * @desc Verify email using verification token
 * @access Public
 */
router.post('/verify-email',
    [
        body('token').notEmpty().withMessage('Verification token is required')
    ],
    validateRequest,
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    error: {
                        message: 'Validation failed',
                        details: errors.array(),
                        code: 'VALIDATION_ERROR'
                    }
                });
            }

            const { token } = req.body;

            // Find verification token
            const verificationToken = await findPasswordResetToken(token, 'email_verification');
            if (!verificationToken) {
                return res.status(400).json({
                    error: {
                        message: 'Invalid or expired verification token',
                        code: 'INVALID_VERIFICATION_TOKEN'
                    }
                });
            }

            // Check if token is expired
            if (new Date() > verificationToken.expiresAt) {
                await deletePasswordResetToken(token);
                return res.status(400).json({
                    error: {
                        message: 'Verification token has expired',
                        code: 'EXPIRED_VERIFICATION_TOKEN'
                    }
                });
            }

            // Update user email verification status
            const { updateUserEmailVerification } = require('../models/user');
            await updateUserEmailVerification(verificationToken.userId, true);

            // Delete verification token
            await deletePasswordResetToken(token);

            // Track email verification
            await trackAuthEvent('email_verified', {
                userId: verificationToken.userId,
                ip: req.ip,
                userAgent: req.headers['user-agent']
            });

            res.json({
                message: 'Email verified successfully. You can now login.'
            });

        } catch (error) {
            console.error('Email verification error:', error);
            
            res.status(500).json({
                error: {
                    message: 'Failed to verify email',
                    code: 'EMAIL_VERIFICATION_ERROR'
                }
            });
        }
    }
);

/**
 * @route GET /api/v1/auth/me
 * @desc Get current user info
 * @access Private
 */
router.get('/me',
    authenticateToken,
    async (req, res) => {
        try {
            const user = await findUserById(req.user.id);
            if (!user) {
                return res.status(404).json({
                    error: {
                        message: 'User not found',
                        code: 'USER_NOT_FOUND'
                    }
                });
            }

            res.json({
                user: {
                    id: user.id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    role: user.role,
                    emailVerified: user.emailVerified,
                    lastLogin: user.lastLogin,
                    createdAt: user.createdAt
                }
            });

        } catch (error) {
            console.error('Get user info error:', error);
            
            res.status(500).json({
                error: {
                    message: 'Failed to get user info',
                    code: 'GET_USER_ERROR'
                }
            });
        }
    }
);

module.exports = router;
