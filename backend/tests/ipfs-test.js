const fs = require('fs');
const path = require('path');
const ipfsService = require('../src/services/ipfs');

/**
 * Simple test script for IPFS integration
 * Run with: node tests/ipfs-test.js
 */

async function testIpfsIntegration() {
  console.log('🧪 Starting IPFS Integration Tests...\n');

  try {
    // Test 1: Check IPFS node connection
    console.log('📡 Testing IPFS node connection...');
    const nodeInfo = await ipfsService.getNodeInfo();
    console.log('✅ IPFS node connected successfully');
    console.log(`   Version: ${nodeInfo.version.version}`);
    console.log(`   ID: ${nodeInfo.id.id.substring(0, 20)}...\n`);

    // Test 2: Create a test file
    console.log('📄 Creating test file...');
    const testContent = 'Hello, StarkEd IPFS Integration! This is a test file.';
    const testBuffer = Buffer.from(testContent);
    const testFile = {
      buffer: testBuffer,
      originalname: 'test-file.txt',
      mimetype: 'text/plain',
      size: testBuffer.length
    };
    console.log(`   File size: ${testFile.size} bytes\n`);

    // Test 3: Upload file to IPFS
    console.log('⬆️  Testing file upload...');
    const uploadResult = await ipfsService.uploadFile(testFile, null, {
      metadata: {
        test: true,
        description: 'Test file for IPFS integration',
        timestamp: new Date().toISOString()
      }
    });
    console.log('✅ File uploaded successfully');
    console.log(`   CID: ${uploadResult.cid}`);
    console.log(`   Gateway URL: ${uploadResult.gatewayUrl}`);
    console.log(`   Metadata CID: ${uploadResult.metadataCid}\n`);

    // Test 4: Retrieve content from IPFS
    console.log('⬇️  Testing content retrieval...');
    const retrievedContent = await ipfsService.getContent(uploadResult.cid);
    const retrievedText = retrievedContent.toString();
    console.log('✅ Content retrieved successfully');
    console.log(`   Retrieved: "${retrievedText}"`);
    console.log(`   Match: ${retrievedText === testContent ? '✅' : '❌'}\n`);

    // Test 5: Retrieve metadata
    console.log('📋 Testing metadata retrieval...');
    const metadata = await ipfsService.getMetadata(uploadResult.metadataCid);
    console.log('✅ Metadata retrieved successfully');
    console.log(`   Name: ${metadata.name}`);
    console.log(`   Size: ${metadata.size} bytes`);
    console.log(`   Content Type: ${metadata.contentType}`);
    console.log(`   Test flag: ${metadata.test}\n`);

    // Test 6: Pin content
    console.log('📌 Testing content pinning...');
    const pinResult = await ipfsService.pinContent(uploadResult.cid);
    console.log('✅ Content pinned successfully');
    console.log(`   Pinned CID: ${pinResult.cid}\n`);

    // Test 7: Cache statistics
    console.log('💾 Testing cache statistics...');
    const cacheStats = ipfsService.getCacheStats();
    console.log('✅ Cache statistics retrieved');
    console.log(`   Total entries: ${cacheStats.totalEntries}`);
    console.log(`   Valid entries: ${cacheStats.validEntries}`);
    console.log(`   Cache size: ${Math.round(cacheStats.cacheSize / 1024)} KB\n`);

    // Test 8: Unpin content
    console.log('📍 Testing content unpinning...');
    const unpinResult = await ipfsService.unpinContent(uploadResult.cid);
    console.log('✅ Content unpinned successfully');
    console.log(`   Unpinned CID: ${unpinResult.cid}\n`);

    console.log('🎉 All IPFS integration tests passed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.isIpfsError) {
      console.error(`   Operation: ${error.operation}`);
      console.error(`   Details:`, error.details);
    }
    process.exit(1);
  }
}

// Run tests
if (require.main === module) {
  testIpfsIntegration();
}

module.exports = { testIpfsIntegration };
