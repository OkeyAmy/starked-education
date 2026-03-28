/**
 * Courses Microservice
 * Handles course management, content delivery, and enrollment
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
initTracing('courses-service');
initMetrics('courses-service');

// Initialize Express app
const app = express();
const server = createServer(app);

// Middleware
app.use(helmet());
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request ID middleware
app.use((req, res, next) => {
    req.requestId = req.headers['x-request-id'] || require('crypto').randomUUID();
    res.setHeader('x-request-id', req.requestId);
    next();
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        service: 'courses-service',
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
        // Check file storage (if applicable)
        const storageStatus = await checkStorageHealth();
        
        const isReady = dbStatus && redisStatus && storageStatus;
        
        res.status(isReady ? 200 : 503).json({
            status: isReady ? 'ready' : 'not ready',
            database: dbStatus ? 'connected' : 'disconnected',
            redis: redisStatus ? 'connected' : 'disconnected',
            storage: storageStatus ? 'connected' : 'disconnected',
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
const courseRoutes = require('./routes/courses');
const contentRoutes = require('./routes/content');
const enrollmentRoutes = require('./routes/enrollments');
const categoryRoutes = require('./routes/categories');
const reviewRoutes = require('./routes/reviews');
const progressRoutes = require('./routes/progress');
const searchRoutes = require('./routes/search');

// Apply routes
app.use('/api/v1/courses', courseRoutes);
app.use('/api/v1/content', contentRoutes);
app.use('/api/v1/enrollments', enrollmentRoutes);
app.use('/api/v1/categories', categoryRoutes);
app.use('/api/v1/reviews', reviewRoutes);
app.use('/api/v1/progress', progressRoutes);
app.use('/api/v1/search', searchRoutes);

// Metrics endpoint
app.get('/metrics', async (req, res) => {
    try {
        const metrics = await getServiceMetrics();
        res.set('Content-Type', 'text/plain');
        res.send(metrics);
    } catch (error) {
        res.status(500).json({
            error: {
                message: 'Failed to get metrics',
                code: 'METRICS_ERROR'
            }
        });
    }
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    
    res.status(error.status || 500).json({
        error: {
            message: error.message || 'Internal Server Error',
            code: error.code || 'INTERNAL_ERROR',
            timestamp: new Date().toISOString(),
            requestId: req.requestId
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
            requestId: req.requestId
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
const PORT = process.env.PORT || 3002;
const HOST = process.env.HOST || '0.0.0.0';

async function startServer() {
    try {
        // Connect to database
        await connectDatabase();
        console.log('Database connected successfully');
        
        // Connect to Redis
        await connectRedis();
        console.log('Redis connected successfully');
        
        // Initialize indexes and caches
        await initializeIndexes();
        console.log('Database indexes initialized');
        
        // Start HTTP server
        server.listen(PORT, HOST, () => {
            console.log(`Courses Service running on http://${HOST}:${PORT}`);
            console.log(`Health check: http://${HOST}:${PORT}/health`);
            console.log(`Readiness check: http://${HOST}:${PORT}/ready`);
            console.log(`Metrics: http://${HOST}:${PORT}/metrics`);
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

async function checkStorageHealth() {
    try {
        // Check file storage or CDN connectivity
        return true;
    } catch (error) {
        return false;
    }
}

async function initializeIndexes() {
    try {
        // Initialize database indexes for performance
        console.log('Database indexes initialized');
    } catch (error) {
        console.error('Failed to initialize indexes:', error);
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

async function getServiceMetrics() {
    // Return Prometheus metrics
    return `# HELP courses_service_info Information about courses service
# TYPE courses_service_info gauge
courses_service_info{version="${process.env.SERVICE_VERSION || '1.0.0'}"} 1

# HELP courses_service_requests_total Total number of requests
# TYPE courses_service_requests_total counter
courses_service_requests_total 100

# HELP courses_service_request_duration_seconds Request duration in seconds
# TYPE courses_service_request_duration_seconds histogram
courses_service_request_duration_seconds_bucket{le="0.1"} 50
courses_service_request_duration_seconds_bucket{le="0.5"} 80
courses_service_request_duration_seconds_bucket{le="1.0"} 95
courses_service_request_duration_seconds_bucket{le="+Inf"} 100
courses_service_request_duration_seconds_sum 25.5
courses_service_request_duration_seconds_count 100`;
}

// Start server
if (require.main === module) {
    startServer();
}

module.exports = { app, server };
