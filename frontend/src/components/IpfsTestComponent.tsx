import React, { useState } from 'react';
import ContentUploader from '../components/ContentUploader';
import ipfsClient, { IpfsClient } from '../lib/ipfs';

/**
 * IPFS Integration Test Component
 * Use this component to test the IPFS integration functionality
 */

const IpfsTestComponent: React.FC = () => {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [authToken, setAuthToken] = useState('');

  const addResult = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
    setTestResults(prev => [...prev, `${icon} [${timestamp}] ${message}`]);
  };

  const runTests = async () => {
    setIsRunning(true);
    setTestResults([]);

    try {
      // Test 1: Set auth token
      if (authToken) {
        ipfsClient.setAuthToken(authToken);
        addResult('Authentication token set', 'success');
      } else {
        addResult('No auth token provided, using public access', 'info');
      }

      // Test 2: Check IPFS health
      addResult('Testing IPFS service health...');
      try {
        const health = await ipfsClient.checkHealth();
        if (health.success) {
          addResult(`IPFS service healthy: ${health.status}`, 'success');
        } else {
          addResult(`IPFS service unhealthy: ${health.status}`, 'error');
        }
      } catch (error) {
        addResult(`Health check failed: ${error}`, 'error');
      }

      // Test 3: Get node info
      addResult('Getting IPFS node information...');
      try {
        const nodeInfo = await ipfsClient.getNodeInfo();
        addResult(`Node version: ${nodeInfo.version.version}`, 'success');
        addResult(`Node ID: ${nodeInfo.id.id.substring(0, 20)}...`, 'success');
      } catch (error) {
        addResult(`Node info failed: ${error}`, 'error');
      }

      // Test 4: Get cache stats
      addResult('Getting cache statistics...');
      try {
        const cacheStats = await ipfsClient.getCacheStats();
        addResult(`Cache entries: ${cacheStats.totalEntries}`, 'success');
        addResult(`Cache size: ${Math.round(cacheStats.cacheSize / 1024)} KB`, 'success');
      } catch (error) {
        addResult(`Cache stats failed: ${error}`, 'error');
      }

      // Test 5: Test CID validation
      addResult('Testing CID validation...');
      const validCid = 'QmYwAPJzv5CZsnA625s7Xfjs9uT5WnBvY2nA2q8s7YbD6p';
      const invalidCid = 'invalid-cid';
      
      if (IpfsClient.isValidCid(validCid)) {
        addResult('Valid CID validation: passed', 'success');
      } else {
        addResult('Valid CID validation: failed', 'error');
      }

      if (!IpfsClient.isValidCid(invalidCid)) {
        addResult('Invalid CID validation: passed', 'success');
      } else {
        addResult('Invalid CID validation: failed', 'error');
      }

      // Test 6: Test gateway URL formatting
      addResult('Testing gateway URL formatting...');
      const gatewayUrl = IpfsClient.formatGatewayUrl(validCid);
      const extractedCid = IpfsClient.extractHashFromGatewayUrl(gatewayUrl);
      
      if (gatewayUrl.includes(validCid)) {
        addResult('Gateway URL formatting: passed', 'success');
      } else {
        addResult('Gateway URL formatting: failed', 'error');
      }

      if (extractedCid === validCid) {
        addResult('CID extraction: passed', 'success');
      } else {
        addResult('CID extraction: failed', 'error');
      }

      addResult('All frontend tests completed!', 'success');

    } catch (error) {
      addResult(`Test suite failed: ${error}`, 'error');
    } finally {
      setIsRunning(false);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">IPFS Integration Test</h1>
      
      {/* Test Configuration */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h2 className="text-lg font-semibold mb-4 text-gray-700">Test Configuration</h2>
        
        <div className="mb-4">
          <label htmlFor="authToken" className="block text-sm font-medium text-gray-700 mb-2">
            Authentication Token (optional)
          </label>
          <input
            id="authToken"
            type="text"
            value={authToken}
            onChange={(e) => setAuthToken(e.target.value)}
            placeholder="Enter JWT token for authenticated tests"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex gap-4">
          <button
            onClick={runTests}
            disabled={isRunning}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRunning ? 'Running Tests...' : 'Run Tests'}
          </button>
          <button
            onClick={clearResults}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Clear Results
          </button>
        </div>
      </div>

      {/* Test Results */}
      {testResults.length > 0 && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h2 className="text-lg font-semibold mb-4 text-gray-700">Test Results</h2>
          <div className="space-y-2 font-mono text-sm">
            {testResults.map((result, index) => (
              <div key={index} className="p-2 bg-white rounded border border-gray-200">
                {result}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Test */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h2 className="text-lg font-semibold mb-4 text-gray-700">File Upload Test</h2>
        <ContentUploader
          authToken={authToken}
          onUploadComplete={(result) => {
            addResult(`Upload successful: ${result.cid}`, 'success');
          }}
          onUploadError={(error) => {
            addResult(`Upload failed: ${error.message}`, 'error');
          }}
          className="border-2 border-gray-300 rounded-lg"
        />
      </div>

      {/* Manual Content Test */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <h2 className="text-lg font-semibold mb-4 text-gray-700">Manual Content Test</h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="testCid" className="block text-sm font-medium text-gray-700 mb-2">
              Test CID
            </label>
            <input
              id="testCid"
              type="text"
              placeholder="Enter IPFS CID to test content retrieval"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={async () => {
              const cidInput = document.getElementById('testCid') as HTMLInputElement;
              const cid = cidInput.value.trim();
              if (!cid) {
                addResult('Please enter a CID', 'error');
                return;
              }

              try {
                addResult(`Retrieving content for CID: ${cid.substring(0, 20)}...`);
                const content = await ipfsClient.getContent(cid, 'base64');
                addResult(`Content retrieved successfully (${content.size} bytes)`, 'success');
              } catch (error) {
                addResult(`Content retrieval failed: ${error}`, 'error');
              }
            }}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Test Content Retrieval
          </button>
        </div>
      </div>
    </div>
  );
};

export default IpfsTestComponent;
