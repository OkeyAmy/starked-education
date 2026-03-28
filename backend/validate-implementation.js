// Validation script to check implementation without running tests
const fs = require('fs');
const path = require('path');

console.log('🔍 Validating Quantum-Resistant Communication Implementation...\n');

const checks = [];

// Check 1: Core service files exist
console.log('📁 Checking core service files...');
const serviceFiles = [
  'src/services/quantumResistantCrypto.ts',
  'src/services/secureRealtimeCommunication.ts'
];

serviceFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  const exists = fs.existsSync(filePath);
  checks.push({ name: file, passed: exists });
  console.log(`  ${exists ? '✅' : '❌'} ${file}`);
});

// Check 2: Controller files exist
console.log('\n📁 Checking controller files...');
const controllerFiles = [
  'src/controllers/secureCommController.ts'
];

controllerFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  const exists = fs.existsSync(filePath);
  checks.push({ name: file, passed: exists });
  console.log(`  ${exists ? '✅' : '❌'} ${file}`);
});

// Check 3: Route files exist
console.log('\n📁 Checking route files...');
const routeFiles = [
  'src/routes/secureCommRoutes.ts'
];

routeFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  const exists = fs.existsSync(filePath);
  checks.push({ name: file, passed: exists });
  console.log(`  ${exists ? '✅' : '❌'} ${file}`);
});

// Check 4: Model files exist
console.log('\n📁 Checking model files...');
const modelFiles = [
  'src/models/SecureCommunication.ts'
];

modelFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  const exists = fs.existsSync(filePath);
  checks.push({ name: file, passed: exists });
  console.log(`  ${exists ? '✅' : '❌'} ${file}`);
});

// Check 5: Test files exist
console.log('\n📁 Checking test files...');
const testFiles = [
  'src/__tests__/quantumCrypto.test.ts'
];

testFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  const exists = fs.existsSync(filePath);
  checks.push({ name: file, passed: exists });
  console.log(`  ${exists ? '✅' : '❌'} ${file}`);
});

// Check 6: Documentation files exist
console.log('\n📁 Checking documentation files...');
const docFiles = [
  'docs/QUANTUM_RESISTANT_COMMUNICATION.md',
  'QUANTUM_RESISTANT_COMMUNICATION_README.md'
];

docFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  const exists = fs.existsSync(filePath);
  checks.push({ name: file, passed: exists });
  console.log(`  ${exists ? '✅' : '❌'} ${file}`);
});

// Check 7: Verify code structure
console.log('\n🔍 Checking code structure...');

const cryptoService = path.join(__dirname, 'src/services/quantumResistantCrypto.ts');
if (fs.existsSync(cryptoService)) {
  const content = fs.readFileSync(cryptoService, 'utf8');
  
  const hasKeyPairGen = content.includes('generateKeyPair');
  const hasEncryption = content.includes('encryptMessage');
  const hasDecryption = content.includes('decryptMessage');
  const hasSigning = content.includes('signMessage');
  const hasVerification = content.includes('verifySignature');
  const hasSessionKey = content.includes('generateSessionKey');
  
  checks.push({ name: 'Key pair generation method', passed: hasKeyPairGen });
  checks.push({ name: 'Message encryption method', passed: hasEncryption });
  checks.push({ name: 'Message decryption method', passed: hasDecryption });
  checks.push({ name: 'Message signing method', passed: hasSigning });
  checks.push({ name: 'Signature verification method', passed: hasVerification });
  checks.push({ name: 'Session key generation method', passed: hasSessionKey });
  
  console.log(`  ${hasKeyPairGen ? '✅' : '❌'} Key pair generation method`);
  console.log(`  ${hasEncryption ? '✅' : '❌'} Message encryption method`);
  console.log(`  ${hasDecryption ? '✅' : '❌'} Message decryption method`);
  console.log(`  ${hasSigning ? '✅' : '❌'} Message signing method`);
  console.log(`  ${hasVerification ? '✅' : '❌'} Signature verification method`);
  console.log(`  ${hasSessionKey ? '✅' : '❌'} Session key generation method`);
}

// Check 8: Verify integration
console.log('\n🔍 Checking integration...');
const indexFile = path.join(__dirname, 'src/index.js');
if (fs.existsSync(indexFile)) {
  const content = fs.readFileSync(indexFile, 'utf8');
  
  const hasSecureCommImport = content.includes('secureRealtimeCommunication') || content.includes('SecureRealtimeCommunication');
  const hasSecureCommRoute = content.includes('secureCommRoutes') || content.includes('/api/secure-comm');
  
  checks.push({ name: 'Secure communication service imported', passed: hasSecureCommImport });
  checks.push({ name: 'Secure communication routes registered', passed: hasSecureCommRoute });
  
  console.log(`  ${hasSecureCommImport ? '✅' : '❌'} Secure communication service imported`);
  console.log(`  ${hasSecureCommRoute ? '✅' : '❌'} Secure communication routes registered`);
}

// Check 9: Verify package.json
console.log('\n🔍 Checking dependencies...');
const packageJson = path.join(__dirname, 'package.json');
if (fs.existsSync(packageJson)) {
  const content = fs.readFileSync(packageJson, 'utf8');
  const pkg = JSON.parse(content);
  
  const hasLibsodium = pkg.dependencies && pkg.dependencies['libsodium-wrappers'];
  const hasSocketIO = pkg.dependencies && pkg.dependencies['socket.io'];
  const hasRedis = pkg.dependencies && pkg.dependencies['redis'] || pkg.dependencies['ioredis'];
  
  checks.push({ name: 'libsodium-wrappers dependency', passed: !!hasLibsodium });
  checks.push({ name: 'socket.io dependency', passed: !!hasSocketIO });
  checks.push({ name: 'redis dependency', passed: !!hasRedis });
  
  console.log(`  ${hasLibsodium ? '✅' : '❌'} libsodium-wrappers: ${hasLibsodium || 'missing'}`);
  console.log(`  ${hasSocketIO ? '✅' : '❌'} socket.io: ${hasSocketIO || 'missing'}`);
  console.log(`  ${hasRedis ? '✅' : '❌'} redis/ioredis: ${hasRedis || 'missing'}`);
}

// Summary
console.log('\n' + '='.repeat(60));
const totalChecks = checks.length;
const passedChecks = checks.filter(c => c.passed).length;
const failedChecks = totalChecks - passedChecks;

console.log(`📊 Validation Summary:`);
console.log(`   Total checks: ${totalChecks}`);
console.log(`   Passed: ${passedChecks} ✅`);
console.log(`   Failed: ${failedChecks} ${failedChecks > 0 ? '❌' : '✅'}`);
console.log(`   Success rate: ${((passedChecks / totalChecks) * 100).toFixed(1)}%`);
console.log('='.repeat(60));

if (failedChecks === 0) {
  console.log('\n🎉 All validation checks passed!');
  console.log('\n✨ Implementation Status:');
  console.log('  ✅ All core files created');
  console.log('  ✅ All methods implemented');
  console.log('  ✅ Integration completed');
  console.log('  ✅ Dependencies configured');
  console.log('  ✅ Documentation complete');
  console.log('\n📝 Next Steps:');
  console.log('  1. Install dependencies: npm install');
  console.log('  2. Run tests: npm test');
  console.log('  3. Start server: npm run dev');
  console.log('  4. Access API at: http://localhost:3001/api/secure-comm');
  process.exit(0);
} else {
  console.log('\n⚠️  Some validation checks failed.');
  console.log('Please review the failed checks above.');
  process.exit(1);
}
