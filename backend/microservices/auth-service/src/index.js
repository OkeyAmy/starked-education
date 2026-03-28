/**
 * Authentication Microservice
 * Handles user authentication, authorization, and JWT token management
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const { createServer } = require('http');
const { connectRedis } = require('./utils/redis');
const { connectDatabase } = require('./utils/database');
const { initTracing } = require('./utils/tracing');
const { initMetrics } = require('./utils/metrics');

// Load environment variables
dotenv.config();

// Initialize tracing and metrics
initTracing('auth-service');
initMetrics('auth-service');

// Initialize Express app
const app = express();
const server = createServer(app);

// Middleware
app.use(helmet());
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        service: 'auth-service',
        timestamp: new Date().toISOString(),
        version: process.env.SERVICE_VERSION || '1.0.0'
    });
});

// Readiness check endpoint
app.get('/ready', async (req, res) => {
    try {
        // Check database connection
        const dbStatus = await checkDatabaseHealth();
        // Check Redis connection
        const redisStatus = await checkRedisHealth();
        
        const isReady = dbStatus && redisStatus;
        
        res.status(isReady ? 200 : 503).json({
            status: isReady ? 'ready' : 'not ready',
            database: dbStatus ? 'connected' : 'disconnected',
            redis: redisStatus ? 'connected' : 'disconnected',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(503).json({
            status: 'not ready',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const roleRoutes = require('./routes/roles');
const sessionRoutes = require('./routes/sessions');

// Apply routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/roles', roleRoutes);
app.use('/api/v1/sessions', sessionRoutes);

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    
    res.status(error.status || 500).json({
        error: {
            message: error.message || 'Internal Server Error',
            code: error.code || 'INTERNAL_ERROR',
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id']
        }
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: {
            message: 'Endpoint not found',
            code: 'NOT_FOUND',
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id']
        }
    });
});

// Graceful shutdown
const gracefulShutdown = (signal) => {
    console.log(`Received ${signal}, starting graceful shutdown...`);
    
    server.close(() => {
        console.log('HTTP server closed');
        
        // Close database connections
        closeDatabase();
        
        // Close Redis connection
        closeRedis();
        
        process.exit(0);
    });
    
    // Force close after 30 seconds
    setTimeout(() => {
        console.error('Forced shutdown after timeout');
        process.exit(1);
    }, 30000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

async function startServer() {
    try {
        // Connect to database
        await connectDatabase();
        console.log('Database connected successfully');
        
        // Connect to Redis
        await connectRedis();
        console.log('Redis connected successfully');
        
        // Start HTTP server
        server.listen(PORT, HOST, () => {
            console.log(`Auth Service running on http://${HOST}:${PORT}`);
            console.log(`Health check: http://${HOST}:${PORT}/health`);
            console.log(`Readiness check: http://${HOST}:${PORT}/ready`);
        });
        
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Health check functions
async function checkDatabaseHealth() {
    try {
        // Implementation depends on your database
        return true;
    } catch (error) {
        return false;
    }
}

async function checkRedisHealth() {
    try {
        // Implementation depends on your Redis client
        return true;
    } catch (error) {
        return false;
    }
}

async function closeDatabase() {
    // Close database connections
    console.log('Database connections closed');
}

async function closeRedis() {
    // Close Redis connection
    console.log('Redis connection closed');
}

// Start the server
if (require.main === module) {
    startServer();
}

module.exports = { app, server };
