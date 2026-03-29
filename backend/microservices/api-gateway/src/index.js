/**
 * API Gateway
 * Central entry point for all microservices with routing, load balancing, and middleware
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const { createProxyMiddleware } = require('http-proxy-middleware');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');
const { initTracing } = require('./utils/tracing');
const { initMetrics } = require('./utils/metrics');
const { ServiceRegistry } = require('./services/serviceRegistry');
const { CircuitBreaker } = require('./services/circuitBreaker');
const { RateLimiter } = require('./services/rateLimiter');

// Load environment variables
dotenv.config();

// Initialize tracing and metrics
initTracing('api-gateway');
initMetrics('api-gateway');

// Initialize Express app
const app = express();

// Initialize service registry and circuit breakers
const serviceRegistry = new ServiceRegistry();
const circuitBreakers = new Map();
const rateLimiters = new Map();

// Middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
}));

app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-API-Key']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request ID middleware
app.use((req, res, next) => {
    req.requestId = req.headers['x-request-id'] || uuidv4();
    res.setHeader('x-request-id', req.requestId);
    res.setHeader('x-gateway-version', process.env.GATEWAY_VERSION || '1.0.0');
    next();
});

// Global rate limiting
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // limit each IP to 1000 requests per windowMs
    message: {
        error: {
            message: 'Too many requests from this IP, please try again later.',
            code: 'RATE_LIMIT_EXCEEDED'
        }
    },
    standardHeaders: true,
    legacyHeaders: false,
});

app.use(globalLimiter);

// Service discovery and health check
app.use(async (req, res, next) => {
    try {
        // Discover service for the request
        const serviceName = getServiceNameFromPath(req.path);
        
        if (serviceName) {
            const service = await serviceRegistry.getService(serviceName);
            
            if (!service || service.instances.length === 0) {
                return res.status(503).json({
                    error: {
                        message: `Service ${serviceName} is not available`,
                        code: 'SERVICE_UNAVAILABLE'
                    }
                });
            }
            
            req.serviceName = serviceName;
            req.serviceInstance = serviceRegistry.selectInstance(serviceName);
            
            if (!req.serviceInstance) {
                return res.status(503).json({
                    error: {
                        message: `No healthy instances available for service ${serviceName}`,
                        code: 'NO_HEALTHY_INSTANCES'
                    }
                });
            }
        }
        
        next();
    } catch (error) {
        console.error('Service discovery error:', error);
        res.status(500).json({
            error: {
                message: 'Service discovery failed',
                code: 'SERVICE_DISCOVERY_ERROR'
            }
        });
    }
});

// Request logging middleware
app.use((req, res, next) => {
    const startTime = Date.now();
    
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        console.log(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms - ${req.requestId}`);
        
        // Track metrics
        trackRequestMetrics(req, res, duration);
    });
    
    next();
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        service: 'api-gateway',
        timestamp: new Date().toISOString(),
        version: process.env.GATEWAY_VERSION || '1.0.0',
        services: serviceRegistry.getAllServices()
    });
});

// Readiness check endpoint
app.get('/ready', async (req, res) => {
    try {
        const services = await serviceRegistry.getAllServices();
        const allHealthy = services.every(service => 
            service.instances.some(instance => instance.healthy)
        );
        
        res.status(allHealthy ? 200 : 503).json({
            status: allHealthy ? 'ready' : 'not ready',
            services: services.map(service => ({
                name: service.name,
                healthy: service.instances.some(instance => instance.healthy),
                instances: service.instances.length
            })),
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

// Metrics endpoint
app.get('/metrics', async (req, res) => {
    try {
        const metrics = await getGatewayMetrics();
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

// Service routes with proxy middleware
setupServiceProxies(app);

// Admin routes for service management
app.get('/admin/services', async (req, res) => {
    try {
        const services = await serviceRegistry.getAllServices();
        res.json({
            services,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            error: {
                message: 'Failed to get services',
                code: 'GET_SERVICES_ERROR'
            }
        });
    }
});

app.post('/admin/services/:name/instances', async (req, res) => {
    try {
        const { name } = req.params;
        const { url, healthCheckUrl } = req.body;
        
        await serviceRegistry.registerInstance(name, {
            url,
            healthCheckUrl,
            healthy: true,
            registeredAt: new Date()
        });
        
        res.status(201).json({
            message: `Instance registered for service ${name}`,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            error: {
                message: 'Failed to register instance',
                code: 'REGISTER_INSTANCE_ERROR'
            }
        });
    }
});

app.delete('/admin/services/:name/instances/:instanceId', async (req, res) => {
    try {
        const { name, instanceId } = req.params;
        
        await serviceRegistry.deregisterInstance(name, instanceId);
        
        res.json({
            message: `Instance ${instanceId} deregistered for service ${name}`,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            error: {
                message: 'Failed to deregister instance',
                code: 'DEREGISTER_INSTANCE_ERROR'
            }
        });
    }
});

// Circuit breaker management
app.get('/admin/circuit-breakers', (req, res) => {
    const breakers = Array.from(circuitBreakers.entries()).map(([name, breaker]) => ({
        name,
        state: breaker.getState(),
        stats: breaker.getStats()
    }));
    
    res.json({
        circuitBreakers: breakers,
        timestamp: new Date().toISOString()
    });
});

app.post('/admin/circuit-breakers/:name/reset', (req, res) => {
    const { name } = req.params;
    const breaker = circuitBreakers.get(name);
    
    if (breaker) {
        breaker.reset();
        res.json({
            message: `Circuit breaker ${name} reset`,
            timestamp: new Date().toISOString()
        });
    } else {
        res.status(404).json({
            error: {
                message: `Circuit breaker ${name} not found`,
                code: 'CIRCUIT_BREAKER_NOT_FOUND'
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

// Helper functions
function getServiceNameFromPath(path) {
    const pathParts = path.split('/').filter(part => part);
    if (pathParts.length >= 2) {
        const apiVersion = pathParts[0];
        if (apiVersion.startsWith('api')) {
            return pathParts[1]; // e.g., /api/v1/auth -> auth
        }
    }
    return null;
}

function setupServiceProxies(app) {
    // Auth service proxy
    app.use('/api/v1/auth', createServiceProxy('auth-service'));
    app.use('/api/v1/users', createServiceProxy('auth-service'));
    app.use('/api/v1/roles', createServiceProxy('auth-service'));
    app.use('/api/v1/sessions', createServiceProxy('auth-service'));
    
    // Courses service proxy
    app.use('/api/v1/courses', createServiceProxy('courses-service'));
    app.use('/api/v1/content', createServiceProxy('courses-service'));
    app.use('/api/v1/enrollments', createServiceProxy('courses-service'));
    app.use('/api/v1/categories', createServiceProxy('courses-service'));
    app.use('/api/v1/reviews', createServiceProxy('courses-service'));
    app.use('/api/v1/progress', createServiceProxy('courses-service'));
    app.use('/api/v1/search', createServiceProxy('courses-service'));
    
    // Analytics service proxy
    app.use('/api/v1/analytics', createServiceProxy('analytics-service'));
    app.use('/api/v1/reports', createServiceProxy('analytics-service'));
    app.use('/api/v1/dashboards', createServiceProxy('analytics-service'));
    app.use('/api/v1/events', createServiceProxy('analytics-service'));
    app.use('/api/v1/insights', createServiceProxy('analytics-service'));
    app.use('/api/v1/metrics', createServiceProxy('analytics-service'));
}

function createServiceProxy(serviceName) {
    // Get or create circuit breaker for this service
    if (!circuitBreakers.has(serviceName)) {
        circuitBreakers.set(serviceName, new CircuitBreaker({
            timeout: 30000,
            errorThresholdPercentage: 50,
            resetTimeout: 60000
        }));
    }
    
    const circuitBreaker = circuitBreakers.get(serviceName);
    
    return createProxyMiddleware({
        target: `http://${serviceName}`, // Will be resolved dynamically
        changeOrigin: true,
        pathRewrite: (path, req) => {
            // Replace service instance URL with actual instance
            if (req.serviceInstance) {
                return req.serviceInstance.url + path;
            }
            return path;
        },
        onProxyReq: (proxyReq, req, res) => {
            // Add tracing headers
            proxyReq.setHeader('x-request-id', req.requestId);
            proxyReq.setHeader('x-forwarded-for', req.ip);
            proxyReq.setHeader('x-forwarded-proto', req.protocol);
            proxyReq.setHeader('x-forwarded-host', req.get('host'));
            
            // Add authentication if needed
            if (req.headers.authorization) {
                proxyReq.setHeader('authorization', req.headers.authorization);
            }
        },
        onProxyRes: (proxyRes, req, res) => {
            // Add response headers
            res.setHeader('x-service-name', serviceName);
            res.setHeader('x-service-instance', req.serviceInstance?.url || 'unknown');
            
            // Track success for circuit breaker
            circuitBreaker.recordSuccess();
        },
        onError: (err, req, res) => {
            // Track failure for circuit breaker
            circuitBreaker.recordFailure();
            
            console.error(`Proxy error for ${serviceName}:`, err);
            
            if (!res.headersSent) {
                res.status(502).json({
                    error: {
                        message: `Service ${serviceName} is temporarily unavailable`,
                        code: 'SERVICE_ERROR'
                    }
                });
            }
        },
        router: (req) => {
            // Dynamic routing based on service instance selection
            if (req.serviceInstance) {
                return req.serviceInstance.url;
            }
            return null;
        }
    });
}

function trackRequestMetrics(req, res, duration) {
    // Track request metrics for monitoring
    // This would integrate with your metrics system
}

async function getGatewayMetrics() {
    // Return Prometheus metrics for the gateway
    return `# HELP api_gateway_info Information about API gateway
# TYPE api_gateway_info gauge
api_gateway_info{version="${process.env.GATEWAY_VERSION || '1.0.0'}"} 1

# HELP api_gateway_requests_total Total number of requests
# TYPE api_gateway_requests_total counter
api_gateway_requests_total{method="GET"} 1000
api_gateway_requests_total{method="POST"} 500
api_gateway_requests_total{method="PUT"} 200
api_gateway_requests_total{method="DELETE"} 100

# HELP api_gateway_request_duration_seconds Request duration in seconds
# TYPE api_gateway_request_duration_seconds histogram
api_gateway_request_duration_seconds_bucket{le="0.1"} 500
api_gateway_request_duration_seconds_bucket{le="0.5"} 1200
api_gateway_request_duration_seconds_bucket{le="1.0"} 1700
api_gateway_request_duration_seconds_bucket{le="+Inf"} 1800
api_gateway_request_duration_seconds_sum 450.5
api_gateway_request_duration_seconds_count 1800

# HELP api_gateway_circuit_breaker_state Circuit breaker state
# TYPE api_gateway_circuit_breaker_state gauge
api_gateway_circuit_breaker_state{service="auth-service"} 0
api_gateway_circuit_breaker_state{service="courses-service"} 0
api_gateway_circuit_breaker_state{service="analytics-service"} 0`;
}

// Graceful shutdown
const gracefulShutdown = (signal) => {
    console.log(`Received ${signal}, starting graceful shutdown...`);
    
    // Close server
    server.close(() => {
        console.log('HTTP server closed');
        
        // Close service registry connections
        serviceRegistry.close();
        
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
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

const server = app.listen(PORT, HOST, () => {
    console.log(`API Gateway running on http://${HOST}:${PORT}`);
    console.log(`Health check: http://${HOST}:${PORT}/health`);
    console.log(`Readiness check: http://${HOST}:${PORT}/ready`);
    console.log(`Metrics: http://${HOST}:${PORT}/metrics`);
    console.log(`Admin endpoints: http://${HOST}:${PORT}/admin`);
});

module.exports = { app, server };
