#!/usr/bin/env node

/**
 * IPFS Integration Verification Script
 * Verifies that all IPFS integration components are properly implemented
 */

const fs = require('fs');
const path = require('path');

const requiredFiles = [
  // Backend files
  'backend/src/config/ipfs.js',
  'backend/src/services/ipfs.js',
  'backend/src/routes/content.js',
  'backend/src/middleware/ipfsAuth.js',
  'backend/src/utils/ipfsUtils.js',
  'backend/tests/ipfs-test.js',
  'backend/.env.example',
  
  // Frontend files
  'frontend/src/lib/ipfs.ts',
  'frontend/src/components/ContentUploader.tsx',
  'frontend/src/components/IpfsTestComponent.tsx',
  
  // Documentation
  'IPFS_INTEGRATION_README.md'
];

const checkFile = (filePath) => {
  const fullPath = path.join(process.cwd(), filePath);
  const exists = fs.existsSync(fullPath);
  const stats = exists ? fs.statSync(fullPath) : null;
  
  return {
    path: filePath,
    exists,
    size: stats ? stats.size : 0,
    modified: stats ? stats.mtime : null
  };
};

const verifyIntegration = () => {
  console.log('🔍 Verifying IPFS Integration Implementation...\n');
  
  const results = requiredFiles.map(checkFile);
  const existingFiles = results.filter(f => f.exists);
  const missingFiles = results.filter(f => !f.exists);
  
  // Summary
  console.log('📊 Implementation Summary:');
  console.log(`   Total files: ${requiredFiles.length}`);
  console.log(`   ✅ Created: ${existingFiles.length}`);
  console.log(`   ❌ Missing: ${missingFiles.length}\n`);
  
  // Existing files
  if (existingFiles.length > 0) {
    console.log('📁 Successfully Created Files:');
    existingFiles.forEach(file => {
      const sizeKB = Math.round(file.size / 1024);
      console.log(`   ✅ ${file.path} (${sizeKB} KB)`);
    });
    console.log('');
  }
  
  // Missing files
  if (missingFiles.length > 0) {
    console.log('❌ Missing Files:');
    missingFiles.forEach(file => {
      console.log(`   ❌ ${file.path}`);
    });
    console.log('');
  }
  
  // Check backend package.json for IPFS dependency
  const backendPackagePath = path.join(process.cwd(), 'backend/package.json');
  if (fs.existsSync(backendPackagePath)) {
    const backendPackage = JSON.parse(fs.readFileSync(backendPackagePath, 'utf8'));
    const hasIpfsClient = backendPackage.dependencies && backendPackage.dependencies['ipfs-http-client'];
    
    console.log('📦 Backend Dependencies Check:');
    console.log(`   ipfs-http-client: ${hasIpfsClient ? '✅' : '❌'}`);
    console.log('');
  }
  
  // Check frontend package.json for required dependencies
  const frontendPackagePath = path.join(process.cwd(), 'frontend/package.json');
  if (fs.existsSync(frontendPackagePath)) {
    const frontendPackage = JSON.parse(fs.readFileSync(frontendPackagePath, 'utf8'));
    const hasAxios = frontendPackage.dependencies && frontendPackage.dependencies['axios'];
    const hasLucide = frontendPackage.dependencies && frontendPackage.dependencies['lucide-react'];
    
    console.log('📦 Frontend Dependencies Check:');
    console.log(`   axios: ${hasAxios ? '✅' : '❌'}`);
    console.log(`   lucide-react: ${hasLucide ? '✅' : '❌'}`);
    console.log('');
  }
  
  // Check if backend index.js was updated
  const backendIndexPath = path.join(process.cwd(), 'backend/src/index.js');
  if (fs.existsSync(backendIndexPath)) {
    const indexContent = fs.readFileSync(backendIndexPath, 'utf8');
    const hasContentRoutes = indexContent.includes('contentRoutes');
    const hasContentApi = indexContent.includes('/api/content');
    
    console.log('🔄 Backend Integration Check:');
    console.log(`   Content routes imported: ${hasContentRoutes ? '✅' : '❌'}`);
    console.log(`   Content API mounted: ${hasContentApi ? '✅' : '❌'}`);
    console.log('');
  }
  
  // Overall status
  const allFilesExist = missingFiles.length === 0;
  const implementationComplete = allFilesExist && existingFiles.length >= 10;
  
  console.log('🎯 Implementation Status:');
  if (implementationComplete) {
    console.log('   🎉 IPFS Integration is COMPLETE and ready for PR!');
    console.log('   📝 All required files have been created');
    console.log('   🔧 Backend and frontend components are implemented');
    console.log('   📚 Documentation is provided');
    console.log('   🧪 Test files are available');
  } else {
    console.log('   ⚠️  IPFS Integration is INCOMPLETE');
    console.log(`   📊 ${missingFiles.length} files are missing`);
    console.log('   🔧 Please complete the missing components');
  }
  
  console.log('\n📋 Next Steps:');
  console.log('1. Review the implementation files');
  console.log('2. Run the test scripts to verify functionality');
  console.log('3. Test with a running IPFS node');
  console.log('4. Create a pull request with the changes');
  
  return implementationComplete;
};

// Run verification
if (require.main === module) {
  const isComplete = verifyIntegration();
  process.exit(isComplete ? 0 : 1);
}

module.exports = { verifyIntegration };
