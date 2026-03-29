const { createServer } = require('http');

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
const secureCommRoutes = resolveRoute(require('./routes/secureCommRoutes'));

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

// API routes
app.use('/api/quizzes', quizRoutes);
app.use('/api/events', eventLoggerRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/rbac', rbacRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/collaboration', collaborationRoutes);
app.use('/api/holographic', holographicRoutes);
app.use('/api/aco', acoRoutes);
app.use('/api/federated-learning', federatedLearningRoutes);
app.use('/api/swarm-learning', swarmLearningRoutes);
app.use('/api/smart-wallet', smartWalletRoutes);
app.use('/api/secure-comm', secureCommRoutes);
app.use('/api/agi-tutor', agiTutorRoutes);
app.use('/api/analytics', analyticsRoutes);

// Autonomous Agents routes
const autonomousAgentsRoutes = require('./routes/autonomousAgents');
app.use('/api/autonomous-agents', autonomousAgentsRoutes);

// Gamification routes
const gamificationRoutes = require('./routes/gamification');
app.use('/api/gamification', gamificationRoutes);

// Bridge routes
const bridgeRoutes = require('./routes/bridge');
app.use('/api/bridge', bridgeRoutes);

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
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
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
      console.log(`📚 Quiz Management API available at /api/quizzes`);
      console.log(`📊 Event Logger API available at /api/events`);
      console.log(`🔄 Sync API available at /api/sync`);
      console.log(`📁 Content Management API available at /api/content`);
      console.log(`💰 Transaction Queue API available at /api/transactions`);
      console.log(`🤝 Collaboration API available at /api/collaboration`);
      console.log(`🔮 Holographic Storage API available at /api/holographic`);
      console.log(`🧠 ACO API available at /api/aco`);
      console.log(`🌐 Federated Learning API available at /api/federated-learning`);
      console.log(`🧠 AGI Tutor API available at /api/agi-tutor`);
      console.log(`🔐 Quantum-Resistant Secure Communication API available at /api/secure-comm`);
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
