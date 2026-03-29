'use client';

import { useState } from 'react';
import Editor from '@monaco-editor/react';
import axios from 'axios';
import { Play, Copy, Check, Download, Code2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface APIEndpoint {
  path: string;
  method: string;
  description: string;
  parameters?: any[];
}

export default function APIPlayground() {
  const [selectedEndpoint, setSelectedEndpoint] = useState<APIEndpoint | null>(null);
  const [method, setMethod] = useState('GET');
  const [url, setUrl] = useState('');
  const [headers, setHeaders] = useState('{}');
  const [body, setBody] = useState('{}');
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Sample API endpoints
  const endpoints: APIEndpoint[] = [
    {
      path: '/api/autonomous-agents/status',
      method: 'GET',
      description: 'Get autonomous agent system status'
    },
    {
      path: '/api/gamification/leaderboard',
      method: 'GET',
      description: 'Get gamification leaderboard'
    },
    {
      path: '/api/bridge/stats',
      method: 'GET',
      description: 'Get cross-chain bridge statistics'
    },
    {
      path: '/api/gamification/event',
      method: 'POST',
      description: 'Process gamification event',
      parameters: [
        { name: 'userId', type: 'string', required: true },
        { name: 'event', type: 'string', required: true },
        { name: 'data', type: 'object', required: false }
      ]
    }
  ];

  const executeRequest = async () => {
    setLoading(true);
    try {
      const config = {
        method: method.toLowerCase(),
        url: `${process.env.API_BASE_URL}${url}`,
        headers: JSON.parse(headers),
        data: body !== '{}' ? JSON.parse(body) : undefined
      };

      const res = await axios(config);
      setResponse(res.data);
      toast.success('Request successful');
    } catch (error: any) {
      setResponse({
        error: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      toast.error('Request failed');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (response) {
      navigator.clipboard.writeText(JSON.stringify(response, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Copied to clipboard');
    }
  };

  const generateCodeSnippet = (language: string) => {
    const snippets: any = {
      javascript: `// JavaScript (Fetch)
fetch('${process.env.API_BASE_URL}${url}', {
  method: '${method}',
  headers: ${headers},
  ${method !== 'GET' ? `body: ${body},` : ''}
})
.then(response => response.json())
.then(data => console.log(data))
.catch(error => console.error('Error:', error));`,

      python: `# Python (Requests)
import requests

url = "${process.env.API_BASE_URL}${url}"
headers = ${headers}
${method !== 'GET' ? `payload = ${body}` : ''}

response = requests.${method.toLowerCase()}(
    url,
    headers=headers,
    ${method !== 'GET' ? 'json=payload,' : ''}
)

print(response.json())`,

      curl: `curl -X ${method} "${process.env.API_BASE_URL}${url}" -H "${headers.replace(/\n/g, ' ')}" ${method !== 'GET' ? `-d '${body}'` : ''}`
    };

    return snippets[language] || '';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Panel - Endpoint Selection */}
      <div className="lg:col-span-1 space-y-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Code2 className="w-5 h-5" />
            API Endpoints
          </h3>
          
          <div className="space-y-2">
            {endpoints.map((endpoint, index) => (
              <button
                key={index}
                onClick={() => {
                  setSelectedEndpoint(endpoint);
                  setMethod(endpoint.method);
                  setUrl(endpoint.path);
                }}
                className={`w-full text-left p-3 rounded-lg transition-colors ${
                  selectedEndpoint?.path === endpoint.path
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                    : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-0.5 rounded text-xs font-mono ${
                    endpoint.method === 'GET' 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {endpoint.method}
                  </span>
                  <code className="text-sm">{endpoint.path}</code>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {endpoint.description}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Middle Panel - Request Builder */}
      <div className="lg:col-span-2 space-y-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex gap-2 mb-4">
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 border-none"
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
            </select>
            
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="/api/endpoint"
              className="flex-1 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 border-none"
            />
            
            <button
              onClick={executeRequest}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              Send
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2">Headers (JSON)</label>
              <Editor
                height="150px"
                language="json"
                value={headers}
                onChange={(value) => setHeaders(value || '{}')}
                theme="vs-dark"
                options={{ minimap: { enabled: false } }}
              />
            </div>
            
            {method !== 'GET' && (
              <div>
                <label className="block text-sm font-medium mb-2">Body (JSON)</label>
                <Editor
                  height="150px"
                  language="json"
                  value={body}
                  onChange={(value) => setBody(value || '{}')}
                  theme="vs-dark"
                  options={{ minimap: { enabled: false } }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Response Panel */}
        {response && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Response</h3>
              <button
                onClick={copyToClipboard}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            
            <Editor
              height="300px"
              language="json"
              value={JSON.stringify(response, null, 2)}
              theme="vs-dark"
              options={{ readOnly: true, minimap: { enabled: false } }}
            />

            {/* Code Generation */}
            <div className="mt-4 space-y-2">
              <h4 className="text-sm font-medium">Generate Code:</h4>
              <div className="flex gap-2">
                {['javascript', 'python', 'curl'].map((lang) => (
                  <button
                    key={lang}
                    onClick={() => {
                      const snippet = generateCodeSnippet(lang);
                      navigator.clipboard.writeText(snippet);
                      toast.success(`${lang} code copied!`);
                    }}
                    className="px-3 py-1.5 text-sm rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 capitalize"
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
