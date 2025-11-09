import React, { useState } from 'react';
import {
  BookOpenIcon,
  CodeBracketIcon,
  ShieldCheckIcon,
  ClipboardDocumentIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';

const APIDocs: React.FC = () => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://ai-underwriting-system.onrender.com';

  const copyToClipboard = async (text: string, section: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSection(section);
      setTimeout(() => setCopiedSection(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <BookOpenIcon className="w-12 h-12" />
            <h1 className="text-4xl font-bold">API Documentation</h1>
          </div>
          <p className="text-xl text-blue-100 max-w-3xl">
            Integrate your LOS with our underwriting platform using our RESTful API
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Quick Start */}
        <section className="mb-12 bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <CodeBracketIcon className="w-7 h-7 text-blue-600" />
            Quick Start
          </h2>
          <p className="text-gray-700 mb-6">
            Get started with the Underwriting API in 3 simple steps:
          </p>

          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                1
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-2">Create an API Key</h3>
                <p className="text-gray-600 text-sm">
                  Navigate to the API Keys page and generate a new key for your application
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                2
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-2">Get Your Policy ID</h3>
                <p className="text-gray-600 text-sm">
                  From the Policies page, activate a policy and copy its API endpoint URL
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                3
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-2">Make Your First Request</h3>
                <p className="text-gray-600 text-sm">
                  Use the examples below to send your first underwriting request
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Authentication */}
        <section className="mb-12 bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <ShieldCheckIcon className="w-7 h-7 text-green-600" />
            Authentication
          </h2>
          <p className="text-gray-700 mb-6">
            All API requests require authentication using an API key passed in the <code className="bg-gray-100 px-2 py-1 rounded">X-API-Key</code> header.
          </p>

          <div className="bg-gray-900 rounded-lg p-4 relative">
            <button
              onClick={() => copyToClipboard('curl -H "X-API-Key: YOUR_API_KEY" https://api.example.com', 'auth')}
              className="absolute top-2 right-2 text-gray-400 hover:text-white"
            >
              {copiedSection === 'auth' ? (
                <CheckIcon className="w-5 h-5 text-green-400" />
              ) : (
                <ClipboardDocumentIcon className="w-5 h-5" />
              )}
            </button>
            <pre className="text-sm text-gray-100 overflow-x-auto">
              <code>{`curl -H "X-API-Key: YOUR_API_KEY" \\
     ${API_BASE_URL}/api/policies/execute`}</code>
            </pre>
          </div>

          <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              <strong>Security Note:</strong> Never expose your API key in client-side code or public repositories. Keep it secure on your backend server.
            </p>
          </div>
        </section>

        {/* Execute Policy Endpoint */}
        <section className="mb-12 bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Execute Policy</h2>
          <p className="text-gray-700 mb-6">
            Submit an application for underwriting decision using a specific policy.
          </p>

          <div className="mb-6">
            <div className="bg-blue-50 border-l-4 border-blue-600 p-4 mb-4">
              <code className="text-sm font-mono">
                POST {API_BASE_URL}/api/policies/{'<policy_id>'}/execute
              </code>
            </div>

            <h3 className="font-semibold text-gray-900 mb-3">Request Example</h3>
            <div className="bg-gray-900 rounded-lg p-4 relative mb-6">
              <button
                onClick={() =>
                  copyToClipboard(
                    `curl -X POST ${API_BASE_URL}/api/policies/policy_123/execute \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -d '{
    "applicant": {
      "credit_score": 720,
      "annual_income": 75000,
      "employment_status": "employed"
    },
    "loan": {
      "amount": 50000,
      "term_months": 60
    }
  }'`,
                    'request'
                  )
                }
                className="absolute top-2 right-2 text-gray-400 hover:text-white"
              >
                {copiedSection === 'request' ? (
                  <CheckIcon className="w-5 h-5 text-green-400" />
                ) : (
                  <ClipboardDocumentIcon className="w-5 h-5" />
                )}
              </button>
              <pre className="text-sm text-gray-100 overflow-x-auto">
                <code>{`curl -X POST ${API_BASE_URL}/api/policies/policy_123/execute \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -d '{
    "applicant": {
      "credit_score": 720,
      "annual_income": 75000,
      "employment_status": "employed",
      "debt_to_income_ratio": 0.35
    },
    "loan": {
      "amount": 50000,
      "term_months": 60,
      "purpose": "auto"
    }
  }'`}</code>
              </pre>
            </div>

            <h3 className="font-semibold text-gray-900 mb-3">Response Example</h3>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <pre className="text-sm text-gray-800 overflow-x-auto">
                <code>{`{
  "success": true,
  "data": {
    "decision": "Approved",
    "policy_id": "policy_123",
    "execution_time_ms": 45,
    "reasons": [
      "Credit score above minimum threshold",
      "DTI ratio acceptable"
    ],
    "conditions_evaluated": [
      {
        "condition": "credit_score >= 680",
        "result": true,
        "decision": "Approved"
      }
    ]
  }
}`}</code>
              </pre>
            </div>
          </div>
        </section>

        {/* Decision Types */}
        <section className="mb-12 bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Decision Types</h2>
          <div className="space-y-4">
            <div className="flex gap-4 items-start">
              <div className="flex-shrink-0 w-24 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold text-center">
                Approved
              </div>
              <p className="text-gray-700 text-sm">
                Application meets all underwriting criteria and is approved automatically
              </p>
            </div>

            <div className="flex gap-4 items-start">
              <div className="flex-shrink-0 w-24 bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-semibold text-center">
                Rejected
              </div>
              <p className="text-gray-700 text-sm">
                Application fails to meet one or more critical underwriting conditions
              </p>
            </div>

            <div className="flex gap-4 items-start">
              <div className="flex-shrink-0 w-24 bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-semibold text-center">
                Manual Review
              </div>
              <p className="text-gray-700 text-sm">
                Application requires human review due to specific conditions that need verification
              </p>
            </div>
          </div>
        </section>

        {/* Error Handling */}
        <section className="mb-12 bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Error Handling</h2>
          <p className="text-gray-700 mb-6">
            The API uses standard HTTP status codes to indicate success or failure.
          </p>

          <div className="space-y-4">
            <div>
              <code className="bg-gray-900 text-green-400 px-3 py-1 rounded">200 OK</code>
              <p className="text-sm text-gray-600 mt-1">Request successful</p>
            </div>

            <div>
              <code className="bg-gray-900 text-yellow-400 px-3 py-1 rounded">400 Bad Request</code>
              <p className="text-sm text-gray-600 mt-1">Invalid request format or missing required fields</p>
            </div>

            <div>
              <code className="bg-gray-900 text-red-400 px-3 py-1 rounded">401 Unauthorized</code>
              <p className="text-sm text-gray-600 mt-1">Invalid or missing API key</p>
            </div>

            <div>
              <code className="bg-gray-900 text-red-400 px-3 py-1 rounded">404 Not Found</code>
              <p className="text-sm text-gray-600 mt-1">Policy not found or inactive</p>
            </div>

            <div>
              <code className="bg-gray-900 text-red-400 px-3 py-1 rounded">500 Server Error</code>
              <p className="text-sm text-gray-600 mt-1">Internal server error</p>
            </div>
          </div>

          <div className="mt-6 bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-2">Error Response Format</h3>
            <pre className="text-sm text-gray-800">
              <code>{`{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Missing required field: credit_score"
  }
}`}</code>
            </pre>
          </div>
        </section>

        {/* Rate Limits */}
        <section className="mb-12 bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Rate Limits</h2>
          <p className="text-gray-700 mb-4">
            API requests are rate-limited to ensure fair usage and system stability.
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <ul className="space-y-2 text-sm text-blue-900">
              <li>• <strong>Default:</strong> 100 requests per minute</li>
              <li>• <strong>Burst:</strong> Up to 200 requests in a short burst</li>
              <li>• <strong>Daily:</strong> 10,000 requests per day</li>
            </ul>
          </div>

          <p className="text-sm text-gray-600 mt-4">
            If you exceed the rate limit, you'll receive a <code className="bg-gray-100 px-1 rounded">429 Too Many Requests</code> response. Contact support for higher limits.
          </p>
        </section>

        {/* SDKs & Libraries */}
        <section className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">SDKs & Libraries</h2>
          <p className="text-gray-700 mb-6">
            We provide official SDKs for popular programming languages to make integration easier.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <h3 className="font-semibold text-gray-900 mb-2">JavaScript / Node.js</h3>
              <code className="text-sm bg-gray-100 px-2 py-1 rounded">npm install @underwriting/sdk</code>
            </div>

            <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <h3 className="font-semibold text-gray-900 mb-2">Python</h3>
              <code className="text-sm bg-gray-100 px-2 py-1 rounded">pip install underwriting-sdk</code>
            </div>

            <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <h3 className="font-semibold text-gray-900 mb-2">Ruby</h3>
              <code className="text-sm bg-gray-100 px-2 py-1 rounded">gem install underwriting</code>
            </div>
          </div>

          <p className="text-sm text-gray-500 mt-4">
            Coming soon: Java, PHP, and .NET SDKs
          </p>
        </section>
      </div>
    </div>
  );
};

export default APIDocs;
