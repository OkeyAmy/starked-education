const dotenv = require('dotenv');

dotenv.config();

const ipfsConfig = {
  // IPFS node configuration
  host: process.env.IPFS_HOST || 'localhost',
  port: process.env.IPFS_PORT || 5001,
  protocol: process.env.IPFS_PROTOCOL || 'http',
  
  // IPFS API configuration
  apiPath: process.env.IPFS_API_PATH || '/api/v0',
  
  // Gateway configuration
  gatewayUrl: process.env.IPFS_GATEWAY_URL || 'https://ipfs.io/ipfs/',
  
  // Upload configuration
  maxFileSize: parseInt(process.env.IPFS_MAX_FILE_SIZE) || 100 * 1024 * 1024, // 100MB
  chunkSize: parseInt(process.env.IPFS_CHUNK_SIZE) || 1024 * 1024, // 1MB chunks
  
  // Pinning configuration
  autoPin: process.env.IPFS_AUTO_PIN === 'true',
  pinTimeout: parseInt(process.env.IPFS_PIN_TIMEOUT) || 30000, // 30 seconds
  
  // Caching configuration
  enableCache: process.env.IPFS_ENABLE_CACHE === 'true',
  cacheTimeout: parseInt(process.env.IPFS_CACHE_TIMEOUT) || 3600000, // 1 hour
  
  // Retry configuration
  maxRetries: parseInt(process.env.IPFS_MAX_RETRIES) || 3,
  retryDelay: parseInt(process.env.IPFS_RETRY_DELAY) || 1000, // 1 second
  
  // Authentication configuration (if using IPFS Cluster or private gateway)
  auth: {
    enabled: process.env.IPFS_AUTH_ENABLED === 'true',
    username: process.env.IPFS_AUTH_USERNAME,
    password: process.env.IPFS_AUTH_PASSWORD,
    token: process.env.IPFS_AUTH_TOKEN
  },
  
  // Content types that are allowed for upload
  allowedContentTypes: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/webm',
    'audio/mpeg',
    'audio/wav',
    'application/pdf',
    'text/plain',
    'application/json',
    'text/markdown'
  ],
  
  // Metadata configuration
  metadata: {
    includeTimestamp: process.env.IPFS_INCLUDE_TIMESTAMP !== 'false',
    includeUploader: process.env.IPFS_INCLUDE_UPLOADER === 'true',
    includeContentType: process.env.IPFS_INCLUDE_CONTENT_TYPE !== 'false',
    includeFileSize: process.env.IPFS_INCLUDE_FILE_SIZE !== 'false'
  }
};

// Validate required configuration
const validateConfig = () => {
  const errors = [];
  
  if (ipfsConfig.auth.enabled && !ipfsConfig.auth.username && !ipfsConfig.auth.token) {
    errors.push('IPFS authentication is enabled but no credentials provided');
  }
  
  if (ipfsConfig.maxFileSize <= 0) {
    errors.push('IPFS max file size must be greater than 0');
  }
  
  if (ipfsConfig.chunkSize <= 0) {
    errors.push('IPFS chunk size must be greater than 0');
  }
  
  if (errors.length > 0) {
    throw new Error(`IPFS configuration validation failed: ${errors.join(', ')}`);
  }
  
  return true;
};

// Get IPFS client configuration
const getClientConfig = () => {
  const config = {
    host: ipfsConfig.host,
    port: ipfsConfig.port,
    protocol: ipfsConfig.protocol,
    apiPath: ipfsConfig.apiPath,
    timeout: ipfsConfig.pinTimeout
  };
  
  // Add authentication if enabled
  if (ipfsConfig.auth.enabled && ipfsConfig.auth.username) {
    config.headers = {
      'Authorization': `Basic ${Buffer.from(`${ipfsConfig.auth.username}:${ipfsConfig.auth.password}`).toString('base64')}`
    };
  } else if (ipfsConfig.auth.enabled && ipfsConfig.auth.token) {
    config.headers = {
      'Authorization': `Bearer ${ipfsConfig.auth.token}`
    };
  }
  
  return config;
};

module.exports = {
  ipfsConfig,
  validateConfig,
  getClientConfig
};
