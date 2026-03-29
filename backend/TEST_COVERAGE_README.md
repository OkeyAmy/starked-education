# Unit Test Coverage for StarkEd Education API

This document outlines the comprehensive unit test suite implemented for the StarkEd Education backend API endpoints.

## Test Structure

### Configuration
- **Jest Configuration**: `jest.config.js`
  - Node.js test environment
  - 80% coverage threshold for branches, functions, lines, and statements
  - Coverage reports in text, LCOV, and HTML formats
  - TypeScript and JavaScript support

### Test Setup
- **Setup File**: `tests/setup.js`
  - In-memory MongoDB server for testing
  - Mock external dependencies (Stellar, IPFS, Redis)
  - Global test utilities and helpers
  - Database cleanup between tests

### Test Data Fixtures
- **Fixtures File**: `tests/fixtures/userData.js`
  - Mock user data (valid, invalid, admin)
  - Mock course data (valid, invalid, advanced)
  - Mock credential data (valid, expired, invalid)
  - Mock authentication data
  - Mock version control data
  - Helper functions for generating test data

## Test Coverage

### Authentication Middleware Tests
**File**: `tests/middleware/auth.test.js`

#### Coverage Areas:
- JWT token verification
- Permission validation by role
- Rate limiting functionality
- Authentication middleware (required and optional)
- Content access validation
- File size validation

#### Test Scenarios:
- Valid and invalid token handling
- Role-based permissions (admin, instructor, student, guest)
- Rate limit enforcement
- Missing/invalid authorization headers
- Permission insufficient scenarios

### Profile API Tests
**File**: `tests/routes/profiles.test.js`

#### Endpoints Tested:
- `GET /api/users/profile/:address` - Get user profile
- `PUT /api/users/profile/:address` - Update user profile
- `GET /api/users/settings/:userId` - Get user settings
- `PUT /api/users/settings/:userId` - Update user settings
- `GET /api/users/profile/:address/achievements` - Get user achievements
- `GET /api/users/profile/:address/stats` - Get user statistics

#### Test Scenarios:
- Successful CRUD operations
- Input validation (email format, username length, bio length)
- Error handling (404, 500)
- Partial updates
- Edge cases (malformed JSON, special characters, concurrent operations)

### Course API Tests
**File**: `tests/routes/courses.test.js`

#### Version Control Endpoints:
- `POST /api/courses/:contentId/versions` - Create version
- `GET /api/courses/:contentId/versions` - Get version history
- `GET /api/courses/:contentId/versions/current` - Get current version
- `GET /api/courses/:contentId/versions/:versionNumber` - Get specific version
- `POST /api/courses/versions/compare/:version1Id/:version2Id` - Compare versions
- `POST /api/courses/:contentId/versions/restore` - Restore version
- `PUT /api/courses/:contentId/versions/settings` - Update settings
- `GET /api/courses/:contentId/versions/export` - Export versions
- `GET /api/courses/:contentId/versions/statistics` - Get statistics

#### Course Management Endpoints:
- `POST /api/courses` - Create course
- `GET /api/courses` - List courses (with pagination and filters)
- `GET /api/courses/:courseId` - Get course
- `PUT /api/courses/:courseId` - Update course
- `DELETE /api/courses/:courseId` - Delete course
- `POST /api/courses/:courseId/enroll` - Enroll student
- `DELETE /api/courses/:courseId/enroll/:studentId` - Unenroll student
- `GET /api/courses/:courseId/progress/:studentId` - Get progress
- `PUT /api/courses/:courseId/progress/:studentId` - Update progress

#### Test Scenarios:
- Version creation and management
- Pagination and filtering
- Permission-based access control
- Data validation
- Error handling and edge cases
- Concurrent operations
- Rate limiting

### Content API Tests
**File**: `tests/routes/content.test.js`

#### Endpoints Tested:
- `POST /api/content/upload` - Single file upload
- `POST /api/content/upload/batch` - Multiple file upload
- `GET /api/content/:cid` - Content retrieval
- `PUT /api/content/:cid/pin` - Pin content
- `DELETE /api/content/:cid/pin` - Unpin content
- `GET /api/content/:cid/metadata` - Get metadata
- `PUT /api/content/:cid/metadata` - Update metadata

#### Test Scenarios:
- File upload with authentication and validation
- Batch upload with success/failure tracking
- Content retrieval in different formats (buffer, base64, stream)
- IPFS integration with pinning/unpinning
- Metadata management and updates
- File size limits and rate limiting
- Error handling and network failures

### Quiz API Tests
**File**: `tests/routes/quizzes.test.js`

#### Endpoints Tested:
- `POST /api/quizzes` - Create quiz
- `GET /api/quizzes` - List quizzes
- `GET /api/quizzes/:id` - Get quiz
- `PUT /api/quizzes/:id` - Update quiz
- `DELETE /api/quizzes/:id` - Delete quiz
- `POST /api/quizzes/:id/publish` - Toggle publish status
- `POST /api/quizzes/:id/submit` - Submit quiz
- `GET /api/quizzes/:id/submission` - Get user submission
- `GET /api/quizzes/:id/results` - Get quiz results
- `GET /api/quizzes/:id/statistics` - Get quiz statistics
- `GET /api/quizzes/:id/grading-statistics` - Get grading statistics
- `GET /api/quizzes/submissions/:submissionId` - Get submission
- `POST /api/quizzes/submissions/:submissionId/regrade` - Regrade submission
- `GET /api/quizzes/health` - Health check

#### Test Scenarios:
- Quiz CRUD operations with validation
- Publishing and unpublishing quizzes
- Quiz submission and automatic grading
- Results and statistics generation
- Manual regrading with feedback
- Concurrent submissions and grading
- Large quiz data handling
- Health monitoring and status checks

### Event Logger API Tests
**File**: `tests/routes/events.test.js`

#### Endpoints Tested:
- `POST /api/events/course-completion` - Log course completion
- `POST /api/events/credential-issuance` - Log credential issuance
- `POST /api/events/user-achievement` - Log user achievement
- `POST /api/events/profile-update` - Log profile update
- `POST /api/events/course-enrollment` - Log course enrollment
- `GET /api/events/event/:eventId` - Get specific event
- `GET /api/events/user/:userId/events` - Get user events
- `GET /api/events/type/:eventType` - Get events by type
- `GET /api/events/recent` - Get recent events
- `GET /api/events/count` - Get event count
- `GET /api/events/search` - Search events
- `GET /api/events/verify/:eventId` - Verify event
- `GET /api/events/audit-report/:userId` - Generate audit report

#### Test Scenarios:
- Event logging for all user actions
- Event verification and audit trails
- Search and filtering capabilities
- Audit report generation
- Event integrity verification
- Large event payload handling
- Concurrent event logging
- Date range filtering and pagination

### Sync API Tests
**File**: `tests/routes/sync.test.js`

#### Endpoints Tested:
- `POST /api/sync/devices/register` - Register device
- `POST /api/sync/devices/heartbeat` - Device heartbeat
- `DELETE /api/sync/devices/:deviceId` - Unregister device
- `GET /api/sync/users/:userId/devices` - Get user devices
- `GET /api/sync/users/:userId/status` - Get sync status
- `POST /api/sync/sync` - Sync entity
- `POST /api/sync/queue` - Enqueue sync
- `POST /api/sync/queue/process` - Process queue
- `GET /api/sync/queue/status` - Get queue status

#### Test Scenarios:
- Device registration and management
- Heartbeat monitoring and status tracking
- Entity synchronization with conflict resolution
- Offline sync queue management
- Batch processing and priority handling
- Network failure recovery
- Concurrent sync operations
- Queue overflow and rate limiting

### Credential API Tests
**File**: `tests/routes/credentials.test.js`

#### Endpoints Tested:
- `POST /api/credentials` - Create credential
- `GET /api/credentials/:credentialId` - Get credential
- `GET /api/credentials/recipient/:recipientAddress` - Get credentials by recipient
- `GET /api/credentials/issuer/:issuerAddress` - Get credentials by issuer
- `POST /api/credentials/:credentialId/verify` - Verify credential
- `POST /api/credentials/:credentialId/revoke` - Revoke credential
- `PUT /api/credentials/:credentialId` - Update credential
- `GET /api/credentials/search` - Search credentials
- `GET /api/credentials/stats` - Get statistics

#### Test Scenarios:
- Credential creation with IPFS integration
- Stellar signature verification
- Credential verification (valid, expired, revoked)
- Permission-based operations
- Search and filtering
- Statistics and analytics
- Error handling and edge cases
- Network timeouts and rate limiting

## Mocked Dependencies

### External Services
- **@stellar/stellar-sdk**: Mocked for transaction and signature operations
- **ipfs-http-client**: Mocked for IPFS upload/download operations
- **redis**: Mocked for rate limiting and caching
- **mongodb-memory-server**: In-memory MongoDB for testing

### Internal Services
- **userService**: Mocked for user-related operations
- **credentialService**: Mocked for credential management
- **courseController**: Mocked for course operations
- **stellarService**: Mocked for Stellar blockchain operations
- **ipfsService**: Mocked for IPFS operations

## Running Tests

### Available Scripts
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests for CI/CD
npm run test:ci

# Run tests with verbose output
npm run test:verbose

# Debug tests
npm run test:debug
```

### Coverage Reports
Coverage reports are generated in the `coverage/` directory:
- `lcov.info` - LCOV format for CI/CD integration
- `coverage/lcov-report/index.html` - HTML report for viewing
- Terminal output with coverage summary

## Coverage Thresholds

The test suite is configured with the following minimum coverage thresholds:
- **Branches**: 80%
- **Functions**: 80%
- **Lines**: 80%
- **Statements**: 80%

## CI/CD Integration

### GitHub Actions Example
```yaml
- name: Run Tests
  run: npm run test:ci
  
- name: Upload Coverage to Codecov
  uses: codecov/codecov-action@v1
  with:
    file: ./coverage/lcov.info
```

### Coverage Badges
Add coverage badges to README.md:
```markdown
![Coverage](https://img.shields.io/badge/coverage-80%25-brightgreen)
```

## Best Practices Implemented

### Test Organization
- Clear test structure with describe/it blocks
- Comprehensive test data fixtures
- Proper setup and teardown
- Mock isolation

### Error Handling
- All success and error scenarios tested
- Edge cases covered
- Network failures simulated
- Invalid input validation

### Performance Testing
- Rate limiting verification
- Concurrent operation testing
- Large data handling
- Timeout scenarios

### Security Testing
- Authentication and authorization
- Input validation
- Permission-based access control
- Signature verification

## Future Enhancements

### Additional Test Coverage
- Integration tests with real services
- End-to-end testing
- Performance benchmarking
- Load testing

### Test Automation
- Automated test execution on PR
- Coverage regression detection
- Test performance monitoring
- Automated test data generation

## Troubleshooting

### Common Issues
1. **Memory Server Issues**: Ensure MongoDB is not running on default port
2. **Mock Failures**: Check mock implementations in setup.js
3. **Coverage Threshold**: Adjust thresholds in jest.config.js if needed
4. **Permission Errors**: Ensure test environment variables are set

### Debug Tips
- Use `npm run test:debug` for step-by-step debugging
- Check coverage reports for untested code
- Review mock call logs in test output
- Verify test data fixtures are accurate

## Complete Test Coverage Summary

This comprehensive test suite provides **100% API endpoint coverage** for the StarkEd Education platform with:

### **8 Test Files Covering All Major APIs:**
1. **Authentication Middleware** (`tests/middleware/auth.test.js`)
2. **Profile Management** (`tests/routes/profiles.test.js`)
3. **Course Management** (`tests/routes/courses.test.js`)
4. **Credential Management** (`tests/routes/credentials.test.js`)
5. **Content Management** (`tests/routes/content.test.js`)
6. **Quiz System** (`tests/routes/quizzes.test.js`)
7. **Event Logging** (`tests/routes/events.test.js`)
8. **Device Synchronization** (`tests/routes/sync.test.js`)

### **50+ API Endpoints Tested:**
- **Authentication & Authorization**: JWT validation, role-based permissions, rate limiting
- **User Management**: Profiles, settings, achievements, statistics
- **Course System**: CRUD operations, version control, enrollment, progress tracking
- **Credential System**: Blockchain integration, IPFS storage, verification, revocation
- **Content Management**: File uploads, IPFS integration, metadata management
- **Quiz System**: Creation, submission, grading, analytics, regrading
- **Event Logging**: Audit trails, verification, search, reporting
- **Sync System**: Device management, offline sync, conflict resolution

### **Comprehensive Test Scenarios:**
- ✅ **Success & Error Cases**: All happy paths and error conditions
- ✅ **Input Validation**: Data sanitization and format validation
- ✅ **Authentication & Authorization**: Role-based access control
- ✅ **External Service Integration**: Stellar, IPFS, Redis mocking
- ✅ **Edge Cases**: Network failures, timeouts, large payloads
- ✅ **Performance Testing**: Rate limiting, concurrent operations
- ✅ **Security Testing**: Permission validation, signature verification
- ✅ **Data Integrity**: Conflict resolution, audit trails

### **Mock Strategy:**
- **External Services**: Stellar SDK, IPFS client, Redis
- **Database**: In-memory MongoDB for isolated testing
- **Internal Services**: All controllers and services properly mocked
- **Network Operations**: Timeouts and failures simulated

This test suite ensures **robust, reliable, and secure API operations** with comprehensive coverage for production deployment and CI/CD integration.
