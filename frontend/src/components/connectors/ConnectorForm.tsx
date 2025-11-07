import React, { useState } from 'react';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { connectorApi, ConnectorConfig } from '../../services/connectorApi';

interface ConnectorFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const ConnectorForm: React.FC<ConnectorFormProps> = ({ onSuccess, onCancel }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Basic Info
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('api');
  const [provider, setProvider] = useState('');
  const [protocol, setProtocol] = useState('rest');

  // Connection Settings
  const [apiUrl, setApiUrl] = useState('');
  const [authType, setAuthType] = useState('none');
  const [apiKey, setApiKey] = useState('');
  const [bearerToken, setBearerToken] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [timeout, setTimeout] = useState(30000);
  const [retryCount, setRetryCount] = useState(3);
  const [cacheTtl, setCacheTtl] = useState(300);

  // Advanced Settings
  const [circuitBreakerEnabled, setCircuitBreakerEnabled] = useState(true);
  const [failureThreshold, setFailureThreshold] = useState(5);
  const [successThreshold, setSuccessThreshold] = useState(2);
  const [timeoutDuration, setTimeoutDuration] = useState(60000);

  const [rateLimitEnabled, setRateLimitEnabled] = useState(true);
  const [requestsPerMinute, setRequestsPerMinute] = useState(60);
  const [requestsPerHour, setRequestsPerHour] = useState(1000);

  const [transformationEnabled, setTransformationEnabled] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !apiUrl) {
      setError('Name and API URL are required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Build credentials object based on auth type
      let credentials: any = {};

      if (authType === 'api_key') {
        credentials = { apiKey, headerName: 'X-API-Key' };
      } else if (authType === 'bearer') {
        credentials = { token: bearerToken };
      } else if (authType === 'basic') {
        credentials = { username, password };
      } else if (authType === 'oauth2' || authType === 'jwt') {
        credentials = { token: bearerToken };
      }

      const config: ConnectorConfig = {
        api_url: apiUrl,
        protocol,
        auth_type: authType as any,
        credentials: authType !== 'none' ? credentials : undefined,
        timeout,
        retry_count: retryCount,
        cache_ttl: cacheTtl,
        circuitBreaker: circuitBreakerEnabled
          ? {
              enabled: true,
              failureThreshold,
              successThreshold,
              timeoutDurationMs: timeoutDuration,
            }
          : { enabled: false },
        rateLimit: rateLimitEnabled
          ? {
              enabled: true,
              requestsPerMinute,
              requestsPerHour,
            }
          : { enabled: false },
        transformation: {
          enabled: transformationEnabled,
        },
      };

      await connectorApi.create({
        name,
        type,
        protocol,
        config,
        description: description || undefined,
        provider: provider || undefined,
      });

      onSuccess();
    } catch (err: any) {
      console.error('Failed to create connector:', err);
      setError(err.response?.data?.error?.message || err.message || 'Failed to create connector');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onCancel}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Create Connector</h2>
              <p className="text-sm text-gray-600">Set up a new external API integration</p>
            </div>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            {[
              { num: 1, label: 'Basic Info' },
              { num: 2, label: 'Connection' },
              { num: 3, label: 'Advanced' },
            ].map((s) => (
              <div key={s.num} className="flex items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                    step >= s.num
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {s.num}
                </div>
                <div className="ml-3 flex-1">
                  <p
                    className={`text-sm font-medium ${
                      step >= s.num ? 'text-blue-600' : 'text-gray-500'
                    }`}
                  >
                    {s.label}
                  </p>
                </div>
                {s.num < 3 && (
                  <div
                    className={`h-1 flex-1 mx-4 ${
                      step > s.num ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Connector Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Experian Credit Bureau"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of this connector"
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type *
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="bureau">Credit Bureau</option>
                    <option value="verification">Verification Service</option>
                    <option value="database">Database</option>
                    <option value="los">Loan Origination System</option>
                    <option value="api">General API</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Protocol *
                  </label>
                  <select
                    value={protocol}
                    onChange={(e) => setProtocol(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="rest">REST API</option>
                    <option value="soap">SOAP/XML</option>
                    <option value="graphql">GraphQL</option>
                    <option value="grpc">gRPC (Coming Soon)</option>
                    <option value="websocket">WebSocket (Coming Soon)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Provider
                </label>
                <input
                  type="text"
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  placeholder="e.g., Experian, Equifax, Custom Provider"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          )}

          {/* Step 2: Connection Settings */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  API URL *
                </label>
                <input
                  type="url"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  placeholder="https://api.example.com/v1/endpoint"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Authentication Type
                </label>
                <select
                  value={authType}
                  onChange={(e) => setAuthType(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="none">None</option>
                  <option value="api_key">API Key</option>
                  <option value="bearer">Bearer Token</option>
                  <option value="basic">Basic Auth</option>
                  <option value="oauth2">OAuth 2.0</option>
                  <option value="jwt">JWT</option>
                </select>
              </div>

              {authType === 'api_key' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    API Key
                  </label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter API key"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              )}

              {(authType === 'bearer' || authType === 'oauth2' || authType === 'jwt') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Token
                  </label>
                  <input
                    type="password"
                    value={bearerToken}
                    onChange={(e) => setBearerToken(e.target.value)}
                    placeholder="Enter token"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              )}

              {authType === 'basic' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Username
                    </label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Username"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Password
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Timeout (ms)
                  </label>
                  <input
                    type="number"
                    value={timeout}
                    onChange={(e) => setTimeout(parseInt(e.target.value))}
                    min="1000"
                    max="300000"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Retry Count
                  </label>
                  <input
                    type="number"
                    value={retryCount}
                    onChange={(e) => setRetryCount(parseInt(e.target.value))}
                    min="0"
                    max="10"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cache TTL (sec)
                  </label>
                  <input
                    type="number"
                    value={cacheTtl}
                    onChange={(e) => setCacheTtl(parseInt(e.target.value))}
                    min="0"
                    max="3600"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Advanced Settings */}
          {step === 3 && (
            <div className="space-y-6">
              {/* Circuit Breaker */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Circuit Breaker</h3>
                    <p className="text-sm text-gray-600">
                      Prevents cascading failures by temporarily blocking requests
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCircuitBreakerEnabled(!circuitBreakerEnabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      circuitBreakerEnabled ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        circuitBreakerEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {circuitBreakerEnabled && (
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Failure Threshold
                      </label>
                      <input
                        type="number"
                        value={failureThreshold}
                        onChange={(e) => setFailureThreshold(parseInt(e.target.value))}
                        min="1"
                        max="20"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Success Threshold
                      </label>
                      <input
                        type="number"
                        value={successThreshold}
                        onChange={(e) => setSuccessThreshold(parseInt(e.target.value))}
                        min="1"
                        max="10"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Timeout (ms)
                      </label>
                      <input
                        type="number"
                        value={timeoutDuration}
                        onChange={(e) => setTimeoutDuration(parseInt(e.target.value))}
                        min="10000"
                        max="300000"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Rate Limiting */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Rate Limiting</h3>
                    <p className="text-sm text-gray-600">
                      Control request frequency to prevent overload
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRateLimitEnabled(!rateLimitEnabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      rateLimitEnabled ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        rateLimitEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {rateLimitEnabled && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Requests per Minute
                      </label>
                      <input
                        type="number"
                        value={requestsPerMinute}
                        onChange={(e) => setRequestsPerMinute(parseInt(e.target.value))}
                        min="1"
                        max="10000"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Requests per Hour
                      </label>
                      <input
                        type="number"
                        value={requestsPerHour}
                        onChange={(e) => setRequestsPerHour(parseInt(e.target.value))}
                        min="1"
                        max="100000"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Data Transformation */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Data Transformation</h3>
                    <p className="text-sm text-gray-600">
                      Enable data mapping and validation (configure rules after creation)
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTransformationEnabled(!transformationEnabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      transformationEnabled ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        transformationEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
            <div>
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Previous
                </button>
              )}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onCancel}
                className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>

              {step < 3 ? (
                <button
                  type="button"
                  onClick={() => setStep(step + 1)}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Next
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating...' : 'Create Connector'}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ConnectorForm;
