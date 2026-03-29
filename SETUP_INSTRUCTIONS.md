# Development Environment Setup Instructions

## Prerequisites

Before setting up the StarkEd Consciousness Upload system, ensure you have the following installed:

### Required Software

1. **Node.js (v18+)**
   - Download from: https://nodejs.org/
   - Verify installation: `node --version`
   - Verify npm: `npm --version`

2. **Rust (latest stable)**
   - Install from: https://rustup.rs/
   - Run: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
   - Verify installation: `rustc --version` and `cargo --version`

3. **PostgreSQL (v15+)**
   - Download from: https://www.postgresql.org/download/
   - Create database: `createdb starked_education`

4. **Redis (v7+)**
   - Download from: https://redis.io/download
   - Start Redis server: `redis-server`

## Setup Steps

### 1. Clone Repository
```bash
git clone https://github.com/akordavid373/starked-education.git
cd starked-education
git checkout feature/consciousness-upload
```

### 2. Install Dependencies

#### Backend Dependencies
```bash
cd backend
npm install
```

#### Frontend Dependencies
```bash
cd ../frontend
npm install
```

#### Smart Contract Dependencies
```bash
cd ../contracts
cargo build
```

### 3. Install Soroban CLI
```bash
cargo install soroban-cli --version 21.0.0 --locked
```

### 4. Environment Configuration

#### Backend Environment
Create `.env` file in `backend/` directory:
```env
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://username:password@localhost:5432/starked_education
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_jwt_secret_key_here
STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
CONSCIOUSNESS_CONTRACT_ID=your_contract_id_here
```

#### Frontend Environment
Create `.env.local` file in `frontend/` directory:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_STELLAR_NETWORK=testnet
NEXT_PUBLIC_CONTRACT_ID=your_contract_id_here
```

### 5. Database Setup
```bash
cd backend
npm run migrate
npm run seed
```

### 6. Start Development Servers

#### Start Backend
```bash
cd backend
npm run dev
```

#### Start Frontend
```bash
cd frontend
npm run dev
```

#### Start Redis (if not running)
```bash
redis-server
```

## Testing

### Run Smart Contract Tests
```bash
cd contracts
cargo test consciousness_upload
```

### Run Backend Tests
```bash
cd backend
npm test -- consciousness
```

### Run Frontend Tests
```bash
cd frontend
npm test -- ConsciousnessUpload
```

### Run Integration Tests
```bash
npm run test:integration
```

## Deployment

### Deploy Smart Contracts to Testnet
```bash
cd contracts
npm run deploy:testnet
```

### Deploy Backend
```bash
cd backend
npm run build
npm start
```

### Deploy Frontend
```bash
cd frontend
npm run build
npm start
```

## Windows-Specific Setup

### Using Chocolatey
```powershell
# Install Node.js
choco install nodejs

# Install PostgreSQL
choco install postgresql

# Install Redis
choco install redis-64

# Install Rust (download from rustup.rs)
```

### Using Winget
```powershell
# Install Node.js
winget install OpenJS.NodeJS

# Install PostgreSQL
winget install PostgreSQL.PostgreSQL

# Install Redis
winget install Redis.Redis
```

## Troubleshooting

### Common Issues

1. **Node.js not found**
   - Ensure Node.js is installed and in PATH
   - Restart terminal after installation

2. **Cargo/Rust not found**
   - Install Rust from rustup.rs
   - Restart terminal after installation

3. **PostgreSQL connection failed**
   - Ensure PostgreSQL is running
   - Check database credentials in .env file

4. **Redis connection failed**
   - Ensure Redis server is running
   - Check Redis configuration

5. **Soroban CLI not found**
   - Install with: `cargo install soroban-cli --version 21.0.0 --locked`
   - Add cargo bin directory to PATH

6. **Contract compilation errors**
   - Check Rust toolchain version: `rustup default stable`
   - Update dependencies: `cargo update`

7. **Frontend build errors**
   - Install missing dependencies: `npm install`
   - Check TypeScript configuration

### Port Conflicts
- Backend: Default port 3001
- Frontend: Default port 3000
- PostgreSQL: Default port 5432
- Redis: Default port 6379

Change ports in environment files if conflicts occur.

## Development Workflow

1. **Make changes to code**
2. **Run tests**: `npm test`
3. **Build contracts**: `cd contracts && cargo build`
4. **Test locally**: `npm run dev`
5. **Deploy to testnet**: `npm run deploy:testnet`
6. **Create pull request**

## IDE Configuration

### VS Code Extensions
- Rust Analyzer
- TypeScript and JavaScript Language Features
- ESLint
- Prettier
- PostgreSQL
- Redis

### VS Code Settings
```json
{
  "rust-analyzer.cargo.features": "all",
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

## Performance Optimization

### Backend
- Enable Redis caching
- Use connection pooling for PostgreSQL
- Implement rate limiting

### Frontend
- Enable code splitting
- Use React.memo for components
- Implement lazy loading

### Smart Contracts
- Optimize storage usage
- Minimize transaction costs
- Use efficient data structures

## Security Considerations

1. **Environment Variables**: Never commit .env files
2. **API Keys**: Use secure storage for secrets
3. **Database**: Use parameterized queries
4. **Smart Contracts**: Audit contract code before deployment
5. **Dependencies**: Keep dependencies updated

## Monitoring and Logging

### Backend Logging
```javascript
// Use Winston for structured logging
const logger = require('./utils/logger');
logger.info('Consciousness uploaded', { consciousnessId, owner });
```

### Frontend Error Tracking
```typescript
// Use error boundaries
import ErrorBoundary from './components/ErrorBoundary';
```

### Smart Contract Events
```rust
// Emit events for important actions
env.events().publish(
    (Symbol::new(&env, "consciousness_uploaded"), consciousness_id)
);
```

## Contributing

1. Fork the repository
2. Create feature branch
3. Write tests for new features
4. Ensure all tests pass
5. Submit pull request

## Support

For issues and questions:
- GitHub Issues: https://github.com/akordavid373/starked-education/issues
- Documentation: https://docs.starked-education.com
- Discord: https://discord.gg/starked-education
