import React, { useState } from 'react';
import {
  XMarkIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  CodeBracketIcon,
  KeyIcon,
} from '@heroicons/react/24/outline';

interface APIIntegrationPanelProps {
  policyId: string;
  policyName: string;
  isOpen: boolean;
  onClose: () => void;
  apiKey?: string;
}

const APIIntegrationPanel: React.FC<APIIntegrationPanelProps> = ({
  policyId,
  policyName,
  isOpen,
  onClose,
  apiKey = 'YOUR_API_KEY',
}) => {
  const [copiedEndpoint, setCopiedEndpoint] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [copiedJS, setCopiedJS] = useState(false);
  const [copiedPython, setCopiedPython] = useState(false);

  if (!isOpen) return null;

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://ai-underwriting-system.onrender.com';
  const endpoint = `${API_BASE_URL}/api/policies/${policyId}/execute`;

  const copyToClipboard = async (text: string, setCopied: (val: boolean) => void) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const curlExample = `curl -X POST ${endpoint} \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ${apiKey}" \\
  -d '{
    "applicant": {
      "credit_score": 720,
      "annual_income": 75000,
      "employment_status": "employed"
    },
    "loan": {
      "amount": 50000,
      "term_months": 60,
      "purpose": "auto"
    }
  }'`;

  const javascriptExample = `// Using Fetch API
const response = await fetch('${endpoint}', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': '${apiKey}'
  },
  body: JSON.stringify({
    applicant: {
      credit_score: 720,
      annual_income: 75000,
      employment_status: 'employed'
    },
    loan: {
      amount: 50000,
      term_months: 60,
      purpose: 'auto'
    }
  })
});

const result = await response.json();
console.log(result);
// Expected response:
// {
//   "success": true,
//   "data": {
//     "decision": "Approved",
//     "policy_id": "${policyId}",
//     "execution_time_ms": 45
//   }
// }`;

  const pythonExample = `import requests

url = "${endpoint}"
headers = {
    "Content-Type": "application/json",
    "X-API-Key": "${apiKey}"
}

payload = {
    "applicant": {
        "credit_score": 720,
        "annual_income": 75000,
        "employment_status": "employed"
    },
    "loan": {
        "amount": 50000,
        "term_months": 60,
        "purpose": "auto"
    }
}

response = requests.post(url, json=payload, headers=headers)
result = response.json()
print(result)`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-blue-50 to-indigo-50">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <CodeBracketIcon className="w-7 h-7 text-blue-600" />
              API Integration
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Connect your LOS to <span className="font-semibold">{policyName}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* API Endpoint */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <CodeBracketIcon className="w-5 h-5 text-gray-600" />
              API Endpoint URL
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={endpoint}
                readOnly
                className="flex-1 px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg font-mono text-sm text-gray-900 cursor-text select-all"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <button
                onClick={() => copyToClipboard(endpoint, setCopiedEndpoint)}
                className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                {copiedEndpoint ? (
                  <>
                    <CheckIcon className="w-5 h-5" />
                    Copied!
                  </>
                ) : (
                  <>
                    <ClipboardDocumentIcon className="w-5 h-5" />
                    Copy
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Use this endpoint to execute the underwriting policy from your application
            </p>
          </div>

          {/* API Key Section */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <KeyIcon className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-yellow-900 mb-1">
                  API Key Required
                </h3>
                <p className="text-sm text-yellow-800 mb-2">
                  Include your API key in the <code className="bg-yellow-100 px-1 rounded">X-API-Key</code> header for authentication.
                </p>
                <p className="text-xs text-yellow-700">
                  Don't have an API key? Generate one in the Settings page.
                </p>
              </div>
            </div>
          </div>

          {/* Code Examples */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Integration Examples</h3>

            {/* cURL */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-semibold text-gray-700">cURL</label>
                <button
                  onClick={() => copyToClipboard(curlExample, setCopiedCurl)}
                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  {copiedCurl ? (
                    <>
                      <CheckIcon className="w-4 h-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <ClipboardDocumentIcon className="w-4 h-4" />
                      Copy
                    </>
                  )}
                </button>
              </div>
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                <code>{curlExample}</code>
              </pre>
            </div>

            {/* JavaScript */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-semibold text-gray-700">JavaScript / TypeScript</label>
                <button
                  onClick={() => copyToClipboard(javascriptExample, setCopiedJS)}
                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  {copiedJS ? (
                    <>
                      <CheckIcon className="w-4 h-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <ClipboardDocumentIcon className="w-4 h-4" />
                      Copy
                    </>
                  )}
                </button>
              </div>
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                <code>{javascriptExample}</code>
              </pre>
            </div>

            {/* Python */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-semibold text-gray-700">Python</label>
                <button
                  onClick={() => copyToClipboard(pythonExample, setCopiedPython)}
                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  {copiedPython ? (
                    <>
                      <CheckIcon className="w-4 h-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <ClipboardDocumentIcon className="w-4 h-4" />
                      Copy
                    </>
                  )}
                </button>
              </div>
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                <code>{pythonExample}</code>
              </pre>
            </div>
          </div>

          {/* Response Format */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Expected Response</h3>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <pre className="text-sm text-gray-800 overflow-x-auto">
{`{
  "success": true,
  "data": {
    "decision": "Approved" | "Rejected" | "Manual Review",
    "policy_id": "${policyId}",
    "execution_time_ms": 45,
    "reasons": [...],  // Optional: Reasons for decision
    "conditions_evaluated": [...] // Optional: Detailed condition results
  }
}`}
              </pre>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default APIIntegrationPanel;
