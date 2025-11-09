import React, { useState, useEffect } from 'react';
import {
  PlusIcon,
  KeyIcon,
  TrashIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  EyeIcon,
  EyeSlashIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

interface APIKey {
  id: string;
  name: string;
  key: string;
  created_at: string;
  last_used_at?: string;
  is_active: boolean;
}

const APIKeys: React.FC = () => {
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());

  // Simulate loading API keys (replace with actual API call)
  useEffect(() => {
    loadAPIKeys();
  }, []);

  const loadAPIKeys = () => {
    setLoading(true);
    // Simulate API call - replace with actual backend integration
    setTimeout(() => {
      setApiKeys([
        {
          id: '1',
          name: 'Production LOS Integration',
          key: 'uwsk_live_a1b2c3d4e5f6g7h8i9j0',
          created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          last_used_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          is_active: true,
        },
        {
          id: '2',
          name: 'Development Testing',
          key: 'uwsk_test_x9y8z7w6v5u4t3s2r1q0',
          created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          last_used_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          is_active: true,
        },
      ]);
      setLoading(false);
    }, 500);
  };

  const handleCreateKey = () => {
    if (!newKeyName.trim()) {
      alert('Please enter a name for the API key');
      return;
    }

    // Generate a new API key (in production, this would be done on the backend)
    const newKey = `uwsk_live_${generateRandomString(20)}`;
    const newAPIKey: APIKey = {
      id: Date.now().toString(),
      name: newKeyName,
      key: newKey,
      created_at: new Date().toISOString(),
      is_active: true,
    };

    setApiKeys([...apiKeys, newAPIKey]);
    setCreatedKey(newKey);
    setNewKeyName('');
  };

  const handleDeleteKey = (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete the API key "${name}"? This action cannot be undone.`)) {
      return;
    }

    setApiKeys(apiKeys.filter(key => key.id !== id));
  };

  const toggleKeyVisibility = (id: string) => {
    const newVisible = new Set(visibleKeys);
    if (newVisible.has(id)) {
      newVisible.delete(id);
    } else {
      newVisible.add(id);
    }
    setVisibleKeys(newVisible);
  };

  const copyToClipboard = async (text: string, keyId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(keyId);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const generateRandomString = (length: number): string => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const maskKey = (key: string): string => {
    const visibleStart = key.substring(0, 12);
    const visibleEnd = key.substring(key.length - 4);
    return `${visibleStart}${'*'.repeat(12)}${visibleEnd}`;
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">API Keys</h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage API keys for integrating with your underwriting policies
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
          Create New Key
        </button>
      </div>

      {/* Warning Banner */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
        <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
        <div>
          <h3 className="text-sm font-semibold text-yellow-900 mb-1">Keep Your API Keys Secure</h3>
          <p className="text-sm text-yellow-800">
            Treat API keys like passwords. Never share them publicly or commit them to version control.
            If a key is compromised, delete it immediately and create a new one.
          </p>
        </div>
      </div>

      {/* API Keys List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : apiKeys.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <KeyIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No API Keys Yet</h3>
          <p className="text-gray-600 mb-4">
            Create your first API key to start integrating with your LOS
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Create API Key
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {apiKeys.map((apiKey) => (
            <div
              key={apiKey.id}
              className="bg-white rounded-lg shadow border border-gray-200 p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <KeyIcon className="w-5 h-5 text-blue-600" />
                    {apiKey.name}
                  </h3>
                  <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
                    <span>Created: {new Date(apiKey.created_at).toLocaleDateString()}</span>
                    {apiKey.last_used_at && (
                      <span>Last used: {new Date(apiKey.last_used_at).toRelativeTimeString()}</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteKey(apiKey.id, apiKey.name)}
                  className="text-red-600 hover:text-red-700 p-2 rounded-lg hover:bg-red-50"
                  title="Delete API Key"
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-sm font-mono text-gray-900">
                    {visibleKeys.has(apiKey.id) ? apiKey.key : maskKey(apiKey.key)}
                  </code>
                  <button
                    onClick={() => toggleKeyVisibility(apiKey.id)}
                    className="p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-200"
                    title={visibleKeys.has(apiKey.id) ? 'Hide key' : 'Show key'}
                  >
                    {visibleKeys.has(apiKey.id) ? (
                      <EyeSlashIcon className="w-5 h-5" />
                    ) : (
                      <EyeIcon className="w-5 h-5" />
                    )}
                  </button>
                  <button
                    onClick={() => copyToClipboard(apiKey.key, apiKey.id)}
                    className="p-2 text-blue-600 hover:text-blue-700 rounded-lg hover:bg-blue-50"
                    title="Copy to clipboard"
                  >
                    {copiedKey === apiKey.id ? (
                      <CheckIcon className="w-5 h-5 text-green-600" />
                    ) : (
                      <ClipboardDocumentIcon className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create New Key Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Create New API Key</h2>

            {!createdKey ? (
              <>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Key Name
                  </label>
                  <input
                    type="text"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="e.g., Production LOS Integration"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    autoFocus
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Choose a descriptive name to help you identify this key later
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      setNewKeyName('');
                    }}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateKey}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Create Key
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="mb-6">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                    <p className="text-sm font-semibold text-green-900 mb-2">
                      API Key Created Successfully!
                    </p>
                    <p className="text-sm text-green-800">
                      Copy this key now. You won't be able to see it again.
                    </p>
                  </div>

                  <div className="bg-gray-900 rounded-lg p-4">
                    <code className="text-sm text-green-400 break-all">{createdKey}</code>
                  </div>

                  <button
                    onClick={() => copyToClipboard(createdKey, 'new')}
                    className="w-full mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                  >
                    {copiedKey === 'new' ? (
                      <>
                        <CheckIcon className="w-5 h-5" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <ClipboardDocumentIcon className="w-5 h-5" />
                        Copy API Key
                      </>
                    )}
                  </button>
                </div>

                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setCreatedKey(null);
                  }}
                  className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Done
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Helper function to display relative time
declare global {
  interface Date {
    toRelativeTimeString(): string;
  }
}

Date.prototype.toRelativeTimeString = function() {
  const seconds = Math.floor((Date.now() - this.getTime()) / 1000);

  if (seconds < 60) return `${seconds} seconds ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
};

export default APIKeys;
