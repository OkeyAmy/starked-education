const { createServer } = require('http');
const dotenv = require('dotenv');

const { connectRedis } = require('./utils/redis');
const { initWebsocketService } = require('./services/websocketService');
const { setSyncWebsocketEmitter } = require('./services/syncService');
const { initCollaborationService } = require('./services/initCollaboration');
const { Redis } = require('ioredis');
const SecureRealtimeCommunication = require('./services/secureRealtimeCommunication').default;

const transactionQueue = require('./services/transactionQueue');
const transactionProcessor = require('./workers/transactionProcessor');
const transactionEvents = require('./events/transactionEvents');

// Import security middleware
const {
  securityPerformanceTracker,
  checkBlacklist,
  ddosProtection,
  botDetection,
  advancedRestrictions,
  requestSanitizer
} = require('./middleware/security');
const { globalLimiter } = require('./middleware/rateLimiter');
const { authenticateToken, requireAdmin } = require('./middleware/auth');

// Import versioning middleware
const { versionExtractor, createVersionedRouter, SUPPORTED_VERSIONS, DEFAULT_VERSION } = require('./middleware/versioning');

// Load environment variables
dotenv.config();

// Connect to Redis
connectRedis();

// Helper for default-exported route modules
const resolveRoute = (routeModule) => routeModule.default || routeModule;

// Import routes
const quizRoutes = resolveRoute(require('./routes/quizRoutes'));
const eventLoggerRoutes = resolveRoute(require('./routes/eventLoggerRoutes'));
const syncRoutes = resolveRoute(require('./routes/syncRoutes'));
const rbacRoutes = resolveRoute(require('./routes/rbacRoutes'));
const contentRoutes = require('./routes/content');
const transactionRoutes = require('./routes/transactions');
const notificationRoutes = resolveRoute(require('./routes/notificationRoutes'));

// Your branch routes
const collaborationRoutes = resolveRoute(require('./routes/collaborationRoutes'));
const holographicRoutes = resolveRoute(require('./routes/holographicRoutes'));
let secureCommRoutes;
try {
  secureCommRoutes = resolveRoute(require('./routes/secureCommRoutes'));
} catch (err) {
  console.warn('Warning: Could not load secureCommRoutes:', err.message);
  const express = require('express');
  secureCommRoutes = express.Router();
}

// Upstream routes
const acoRoutes = require('./routes/aco');
const federatedLearningRoutes = require('./routes/federatedLearning');
const swarmLearningRoutes = require('./routes/swarmLearning');
const smartWalletRoutes = resolveRoute(require('./routes/smartWallet'));

// AGI Tutor routes
const agiTutorRoutes = require('./routes/agiTutorRoutes');

// Analytics routes
const analyticsRoutes = require('./routes/analytics');

// Initialize Express app
const app = express();
const server = createServer(app);
const websocketService = initWebsocketService(server);
const collaborationService = initCollaborationService(server);

// Initialize secure communication
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD
});
const secureCommService = new SecureRealtimeCommunication(websocketService.io, redis);

setSyncWebsocketEmitter((userId, event, data) => {
  websocketService.emitToUser(userId, event, data);
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Apply API version extraction middleware globally
app.use(versionExtractor);

// Create versioned routers
const v1Router = createVersionedRouter('v1');

// ── v1 API Routes ──────────────────────────────────────────────
// All existing routes are mounted under /api/v1/
v1Router.use('/quizzes', quizRoutes);
v1Router.use('/events', eventLoggerRoutes);
v1Router.use('/sync', syncRoutes);
v1Router.use('/content', contentRoutes);
v1Router.use('/rbac', rbacRoutes);
v1Router.use('/transactions', transactionRoutes);
v1Router.use('/notifications', notificationRoutes);
v1Router.use('/collaboration', collaborationRoutes);
v1Router.use('/holographic', holographicRoutes);
v1Router.use('/aco', acoRoutes);
v1Router.use('/federated-learning', federatedLearningRoutes);
v1Router.use('/swarm-learning', swarmLearningRoutes);
v1Router.use('/smart-wallet', smartWalletRoutes);
v1Router.use('/secure-comm', secureCommRoutes);
v1Router.use('/agi-tutor', agiTutorRoutes);
v1Router.use('/analytics', analyticsRoutes);

// Autonomous Agents routes
const autonomousAgentsRoutes = require('./routes/autonomousAgents');
v1Router.use('/autonomous-agents', autonomousAgentsRoutes);

// Gamification routes
const gamificationRoutes = require('./routes/gamification');
v1Router.use('/gamification', gamificationRoutes);

// Bridge routes
const bridgeRoutes = require('./routes/bridge');
v1Router.use('/bridge', bridgeRoutes);

// Time-Locked Credential routes
const timeLockCredentialsRoutes = require('./routes/timeLockCredentials');
v1Router.use('/time-lock', timeLockCredentialsRoutes);

// VRF (Verifiable Random Function) routes
const vrfRoutes = require('./routes/vrf');
v1Router.use('/vrf', vrfRoutes);

// Real-time Translation routes
const translationRoutes = require('./routes/translation');
v1Router.use('/translate', translationRoutes);

// Cross-Protocol Bridge routes
const crossProtocolBridgeRoutes = require('./routes/crossProtocolBridge');
v1Router.use('/cross-protocol-bridge', crossProtocolBridgeRoutes);

// Admin dashboard routes
const adminRoutes = require('./routes/admin');
v1Router.use('/admin', adminRoutes);

// Mount v1 router at /api/v1
app.use('/api/v1', v1Router);

// Mount v2 router (empty — ready for future endpoints)
const v2Router = createVersionedRouter('v2');
app.use('/api/v2', v2Router);

// Schemas helper for versioned responses
const { createVersionedResponse } = require('./utils/schemas');

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'StarkEd Education Backend API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  const version = req.apiVersion || DEFAULT_VERSION;
  res.json(createVersionedResponse({
    status: 'healthy',
    uptime: process.uptime(),
    supportedVersions: SUPPORTED_VERSIONS,
  }, version));
});

// Unsupported version handler (only rejects truly unsupported versions)
app.use('/api/v:version*', (req, res, next) => {
  const version = `v${req.params.version}`;
  if (!SUPPORTED_VERSIONS.includes(version)) {
    res.status(400).json({
      success: false,
      message: `Unsupported API version: ${version}`,
      supportedVersions: SUPPORTED_VERSIONS,
    });
  } else {
    next();
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    path: req.originalUrl,
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

const PORT = process.env.PORT || 3001;

async function startServer() {
  try {
    await transactionQueue.startProcessing();
    await transactionProcessor.start();
    await transactionEvents.startListening();

    server.listen(PORT, () => {
      console.log(`🚀 StarkEd Education Backend running on port ${PORT}`);
      console.log(`📚 Quiz Management API available at /api/v1/quizzes`);
      console.log(`📊 Event Logger API available at /api/v1/events`);
      console.log(`🔄 Sync API available at /api/v1/sync`);
      console.log(`📁 Content Management API available at /api/v1/content`);
      console.log(`💰 Transaction Queue API available at /api/v1/transactions`);
      console.log(`🤝 Collaboration API available at /api/v1/collaboration`);
      console.log(`🔮 Holographic Storage API available at /api/v1/holographic`);
      console.log(`🧠 ACO API available at /api/v1/aco`);
      console.log(`🌐 Federated Learning API available at /api/v1/federated-learning`);
      console.log(`🧠 AGI Tutor API available at /api/v1/agi-tutor`);
      console.log(`🔐 Quantum-Resistant Secure Communication API available at /api/v1/secure-comm`);
      console.log(`🏥 Health check available at /api/health`);
      console.log(`✅ Transaction Queue System initialized successfully`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await transactionQueue.stopProcessing();
  await transactionProcessor.stop();
  await transactionEvents.stopListening();
  process.exit(0);
});

if (require.main === module) {
  startServer();
}

module.exports = app;
module.exports.server = server;
