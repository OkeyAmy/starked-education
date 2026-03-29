# IPFS Content Upload Integration

This document describes the IPFS integration implementation for the StarkEd Education platform, providing decentralized content storage and retrieval capabilities.

## Overview

The IPFS integration allows users to upload, store, and retrieve educational content on the InterPlanetary File System (IPFS), providing a decentralized and censorship-resistant storage solution.

## Architecture

### Backend Components

- **`backend/src/config/ipfs.js`** - IPFS configuration and settings
- **`backend/src/services/ipfs.js`** - Core IPFS service implementation
- **`backend/src/routes/content.js`** - REST API endpoints for content operations
- **`backend/src/middleware/ipfsAuth.js`** - Authentication and authorization middleware
- **`backend/src/utils/ipfsUtils.js`** - Utility functions for IPFS operations

### Frontend Components

- **`frontend/src/lib/ipfs.ts`** - TypeScript client for IPFS API
- **`frontend/src/components/ContentUploader.tsx`** - React component for file uploads

## Features

### ✅ Implemented Features

1. **File Upload to IPFS with Metadata**
   - Single file upload
   - Batch file upload (up to 10 files)
   - Automatic metadata generation
   - Progress tracking

2. **Content Retrieval and Caching**
   - Content download in multiple formats (buffer, base64, stream)
   - In-memory caching with TTL
   - Cache statistics and management

3. **Error Handling for IPFS Failures**
   - Comprehensive error handling
   - Retry mechanism for failed operations
   - Detailed error reporting

4. **Progress Tracking for Uploads**
   - Real-time upload progress
   - WebSocket support for live updates
   - Batch upload progress tracking

5. **Authentication and Authorization**
   - JWT-based authentication
   - Role-based permissions (admin, instructor, student, guest)
   - Rate limiting per user role

6. **Content Management**
   - Pin/unpin content
   - Metadata management
   - Content access validation

## API Endpoints

### Upload Operations

#### Upload Single File
```http
POST /api/content/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

Body:
- file: File (required)
- metadata: JSON string (optional)
- includeMetadata: boolean (optional)
- wrapWithDirectory: boolean (optional)
```

#### Upload Multiple Files
```http
POST /api/content/upload/batch
Authorization: Bearer <token>
Content-Type: multipart/form-data

Body:
- files: File[] (required, max 10)
- metadata: JSON string (optional)
- includeMetadata: boolean (optional)
- wrapWithDirectory: boolean (optional)
```

### Content Retrieval

#### Get Content
```http
GET /api/content/:cid?format=<format>&bypassCache=<boolean>
Authorization: Bearer <token> (optional)

Parameters:
- format: buffer | base64 | stream (default: buffer)
- bypassCache: true | false (default: false)
```

#### Get Metadata
```http
GET /api/content/:cid/metadata?metadataCid=<cid>
Authorization: Bearer <token> (optional)

Parameters:
- metadataCid: CID of the metadata (required)
```

### Content Management

#### Pin Content
```http
POST /api/content/:cid/pin
Authorization: Bearer <token>
```

#### Unpin Content
```http
DELETE /api/content/:cid/pin
Authorization: Bearer <token>
```

### System Information

#### Node Information
```http
GET /api/content/node/info
Authorization: Bearer <token>
```

#### Cache Statistics
```http
GET /api/content/cache/stats
Authorization: Bearer <token>
```

#### Clear Cache
```http
DELETE /api/content/cache
Authorization: Bearer <token>
```

#### Health Check
```http
GET /api/content/health
```

## Configuration

### Environment Variables

Create a `.env` file in the backend directory based on `.env.example`:

```env
# IPFS Configuration
IPFS_HOST=localhost
IPFS_PORT=5001
IPFS_PROTOCOL=http
IPFS_API_PATH=/api/v0
IPFS_GATEWAY_URL=https://ipfs.io/ipfs/

# Upload Configuration
IPFS_MAX_FILE_SIZE=104857600  # 100MB
IPFS_CHUNK_SIZE=1048576       # 1MB
IPFS_AUTO_PIN=true
IPFS_PIN_TIMEOUT=30000

# Caching Configuration
IPFS_ENABLE_CACHE=true
IPFS_CACHE_TIMEOUT=3600000     # 1 hour

# Retry Configuration
IPFS_MAX_RETRIES=3
IPFS_RETRY_DELAY=1000

# Authentication
JWT_SECRET=your-secret-key
```

## Usage Examples

### Frontend Usage

```typescript
import ipfsClient from '../lib/ipfs';
import ContentUploader from '../components/ContentUploader';

// Set authentication token
ipfsClient.setAuthToken('your-jwt-token');

// Upload a file
const result = await ipfsClient.uploadFile(file, {
  metadata: { course: 'math101', chapter: 1 },
  onProgress: (progress) => console.log(`${progress.progress}%`)
});

// Retrieve content
const content = await ipfsClient.getContent(result.cid, 'base64');

// Use the uploader component
<ContentUploader
  authToken="your-jwt-token"
  onUploadComplete={(result) => console.log('Uploaded:', result)}
  onUploadError={(error) => console.error('Upload failed:', error)}
/>
```

### Backend Usage

```javascript
const ipfsService = require('./services/ipfs');

// Upload file
const result = await ipfsService.uploadFile(file, user, {
  metadata: { course: 'math101' },
  progressCallback: (progress) => console.log(progress)
});

// Get content
const content = await ipfsService.getContent(cid);

// Pin content
await ipfsService.pinContent(cid);
```

## Security Considerations

1. **Authentication**: All upload operations require JWT authentication
2. **Authorization**: Role-based permissions control access to different operations
3. **Rate Limiting**: Different limits per user role to prevent abuse
4. **File Validation**: File type and size validation before upload
5. **Content Access**: Validation of user permissions for content access

## Error Handling

The system provides comprehensive error handling:

- **IPFS Errors**: Network issues, node unavailable, invalid operations
- **Validation Errors**: File size limits, unsupported formats
- **Authentication Errors**: Invalid tokens, insufficient permissions
- **Rate Limit Errors**: Exceeded operation limits

All errors include detailed information for debugging and user feedback.

## Performance Features

1. **Caching**: In-memory caching reduces IPFS node load
2. **Retry Mechanism**: Automatic retries for transient failures
3. **Progress Tracking**: Real-time feedback for long operations
4. **Batch Operations**: Efficient handling of multiple files

## Testing

To test the IPFS integration:

1. Start the IPFS daemon:
   ```bash
   ipfs daemon
   ```

2. Start the backend server:
   ```bash
   cd backend
   npm run dev
   ```

3. Start the frontend:
   ```bash
   cd frontend
   npm run dev
   ```

4. Test upload functionality through the UI or API endpoints.

## Monitoring

The system provides several monitoring endpoints:

- `/api/content/health` - Service health status
- `/api/content/node/info` - IPFS node information
- `/api/content/cache/stats` - Cache performance metrics

## Future Enhancements

Potential improvements for future versions:

1. **IPFS Cluster Integration**: For production-grade pinning
2. **Content Encryption**: Client-side encryption before upload
3. **CDN Integration**: Faster content delivery
4. **Blockchain Integration**: Store content hashes on Stellar blockchain
5. **Advanced Search**: Metadata-based content search
6. **Version Control**: Content versioning and history

## Troubleshooting

### Common Issues

1. **IPFS Node Connection**: Ensure IPFS daemon is running
2. **Authentication**: Check JWT token validity
3. **File Size**: Verify file size limits
4. **Permissions**: Ensure user has required permissions
5. **Network**: Check network connectivity to IPFS node

### Debug Mode

Enable debug logging by setting:
```env
NODE_ENV=development
```

This will provide detailed error information and stack traces.

## Dependencies

### Backend
- `ipfs-http-client`: IPFS JavaScript client
- `express`: Web framework
- `multer`: File upload handling
- `jsonwebtoken`: JWT authentication
- `joi`: Input validation

### Frontend
- `axios`: HTTP client
- `react`: UI framework
- `lucide-react`: Icon library
- `typescript`: Type safety

## License

This IPFS integration is part of the StarkEd Education platform and is licensed under the MIT License.
