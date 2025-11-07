import React, { useState, useEffect } from 'react';
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import {
  connectorApi,
  Connector,
  ConnectorHealth,
  CircuitBreakerStatus,
  RateLimitStatus,
  ConnectorLog,
} from '../../services/connectorApi';

interface ConnectorDetailsProps {
  connector: Connector;
  onBack: () => void;
  onUpdate: () => void;
}

const ConnectorDetails: React.FC<ConnectorDetailsProps> = ({ connector, onBack, onUpdate }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'logs' | 'config'>('overview');
  const [health, setHealth] = useState<ConnectorHealth | null>(null);
  const [circuitBreaker, setCircuitBreaker] = useState<CircuitBreakerStatus | null>(null);
  const [rateLimit, setRateLimit] = useState<RateLimitStatus | null>(null);
  const [logs, setLogs] = useState<ConnectorLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    loadDetails();
  }, [connector.id]);

  const loadDetails = async () => {
    try {
      setLoading(true);
      const [healthData, logsData] = await Promise.all([
        connectorApi.getHealth(connector.id),
        connectorApi.getLogs(connector.id, 20),
      ]);

      setHealth(healthData);
      setLogs(logsData);

      // Try to load circuit breaker and rate limit status (may not exist for all connectors)
      try {
        const cbStatus = await connectorApi.getCircuitBreakerStatus(connector.id);
        setCircuitBreaker(cbStatus);
      } catch (e) {
        // Circuit breaker not configured
      }

      try {
        const rlStatus = await connectorApi.getRateLimitStatus(connector.id);
        setRateLimit(rlStatus);
      } catch (e) {
        // Rate limit not configured
      }
    } catch (err: any) {
      console.error('Failed to load connector details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    try {
      setTesting(true);
      const result = await connectorApi.test(connector.id);
      if (result.success) {
        alert(`Test successful! Response time: ${result.response_time_ms}ms`);
        loadDetails();
        onUpdate();
      } else {
        alert(`Test failed: ${result.error}`);
      }
    } catch (err: any) {
      alert(`Test error: ${err.message}`);
    } finally {
      setTesting(false);
    }
  };

  const handleResetCircuitBreaker = async () => {
    if (!confirm('Are you sure you want to reset the circuit breaker?')) {
      return;
    }

    try {
      await connectorApi.resetCircuitBreaker(connector.id);
      alert('Circuit breaker reset successfully');
      loadDetails();
    } catch (err: any) {
      alert(`Failed to reset circuit breaker: ${err.message}`);
    }
  };

  const handleResetRateLimit = async () => {
    if (!confirm('Are you sure you want to reset rate limits?')) {
      return;
    }

    try {
      await connectorApi.resetRateLimit(connector.id);
      alert('Rate limits reset successfully');
      loadDetails();
    } catch (err: any) {
      alert(`Failed to reset rate limits: ${err.message}`);
    }
  };

  const getCircuitBreakerStateColor = (state: string) => {
    switch (state) {
      case 'closed':
        return 'text-green-600 bg-green-100';
      case 'open':
        return 'text-red-600 bg-red-100';
      case 'half_open':
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusColor = (code: number) => {
    if (code >= 200 && code < 300) return 'text-green-600';
    if (code >= 400 && code < 500) return 'text-yellow-600';
    if (code >= 500) return 'text-red-600';
    return 'text-gray-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <ArrowPathIcon className="w-12 h-12 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{connector.name}</h1>
              {connector.description && (
                <p className="text-sm text-gray-600">{connector.description}</p>
              )}
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={loadDetails}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              <ArrowPathIcon className="w-5 h-5" />
            </button>
            <button
              onClick={handleTest}
              disabled={testing}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
            >
              {testing ? 'Testing...' : 'Test Connection'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <div>
            <span className="text-sm text-gray-600">Type:</span>
            <p className="text-lg font-semibold capitalize">{connector.type}</p>
          </div>
          <div>
            <span className="text-sm text-gray-600">Protocol:</span>
            <p className="text-lg font-semibold uppercase">{connector.protocol}</p>
          </div>
          <div>
            <span className="text-sm text-gray-600">Status:</span>
            <p className="text-lg font-semibold capitalize">{connector.status}</p>
          </div>
          <div>
            <span className="text-sm text-gray-600">Active:</span>
            <p className="text-lg font-semibold">{connector.is_active ? 'Yes' : 'No'}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'logs', label: 'Logs' },
              { id: 'config', label: 'Configuration' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Health Metrics */}
              {health && (
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Health Metrics</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600 mb-1">Total Calls</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {health.total_calls.toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600 mb-1">Success Rate</p>
                      <p className="text-2xl font-bold text-green-600">{health.success_rate}%</p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600 mb-1">Avg Response</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {health.avg_response_time_ms}ms
                      </p>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600 mb-1">Last 24h</p>
                      <p className="text-2xl font-bold text-orange-600">
                        {health.last_24h_calls.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600 mb-1">Success Count</p>
                      <p className="text-xl font-bold text-gray-900">
                        {health.success_count.toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600 mb-1">Error Count</p>
                      <p className="text-xl font-bold text-gray-900">
                        {health.error_count.toLocaleString()}
                      </p>
                    </div>
                    {health.cache_hit_rate !== undefined && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600 mb-1">Cache Hit Rate</p>
                        <p className="text-xl font-bold text-gray-900">{health.cache_hit_rate}%</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Circuit Breaker */}
              {circuitBreaker && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900">Circuit Breaker</h3>
                    <button
                      onClick={handleResetCircuitBreaker}
                      className="px-3 py-1 text-sm bg-yellow-600 text-white rounded hover:bg-yellow-700"
                    >
                      Reset
                    </button>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="grid grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">State</p>
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${getCircuitBreakerStateColor(
                            circuitBreaker.state
                          )}`}
                        >
                          {circuitBreaker.state.toUpperCase().replace('_', ' ')}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Failure Count</p>
                        <p className="text-lg font-bold text-gray-900">
                          {circuitBreaker.failureCount}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Success Count</p>
                        <p className="text-lg font-bold text-gray-900">
                          {circuitBreaker.successCount}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Consecutive Failures</p>
                        <p className="text-lg font-bold text-gray-900">
                          {circuitBreaker.consecutiveFailures}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Rate Limiting */}
              {rateLimit && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900">Rate Limiting</h3>
                    <button
                      onClick={handleResetRateLimit}
                      className="px-3 py-1 text-sm bg-yellow-600 text-white rounded hover:bg-yellow-700"
                    >
                      Reset
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600 mb-2">Per Minute</p>
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-2xl font-bold text-gray-900">{rateLimit.minute.count}</p>
                          <p className="text-xs text-gray-600">of {rateLimit.minute.limit}</p>
                        </div>
                        <p className="text-sm font-semibold text-blue-600">
                          {rateLimit.minute.remaining} left
                        </p>
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600 mb-2">Per Hour</p>
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-2xl font-bold text-gray-900">{rateLimit.hour.count}</p>
                          <p className="text-xs text-gray-600">of {rateLimit.hour.limit}</p>
                        </div>
                        <p className="text-sm font-semibold text-blue-600">
                          {rateLimit.hour.remaining} left
                        </p>
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600 mb-2">Per Day</p>
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-2xl font-bold text-gray-900">{rateLimit.day.count}</p>
                          <p className="text-xs text-gray-600">of {rateLimit.day.limit}</p>
                        </div>
                        <p className="text-sm font-semibold text-blue-600">
                          {rateLimit.day.remaining} left
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Logs Tab */}
          {activeTab === 'logs' && (
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Activity Logs</h3>
              {logs.length === 0 ? (
                <p className="text-gray-600 text-center py-8">No logs available</p>
              ) : (
                <div className="space-y-3">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-3">
                          {log.status_code >= 200 && log.status_code < 300 ? (
                            <CheckCircleIcon className="w-5 h-5 text-green-500" />
                          ) : log.status_code === 0 ? (
                            <XCircleIcon className="w-5 h-5 text-red-500" />
                          ) : (
                            <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />
                          )}
                          <div>
                            <p className={`font-semibold ${getStatusColor(log.status_code)}`}>
                              {log.status_code === 0 ? 'Error' : `Status ${log.status_code}`}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(log.created_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-gray-900">
                            {log.execution_time_ms}ms
                          </p>
                          {log.cache_hit && (
                            <span className="text-xs text-purple-600 font-semibold">
                              CACHE HIT
                            </span>
                          )}
                        </div>
                      </div>

                      {log.error_message && (
                        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                          {log.error_message}
                        </div>
                      )}

                      <details className="mt-2">
                        <summary className="cursor-pointer text-sm text-blue-600 hover:underline">
                          View Details
                        </summary>
                        <div className="mt-2 p-3 bg-gray-100 rounded text-xs">
                          <div className="mb-2">
                            <strong>Request:</strong>
                            <pre className="mt-1 overflow-auto">
                              {JSON.stringify(log.request_data, null, 2)}
                            </pre>
                          </div>
                          {log.response_data && (
                            <div>
                              <strong>Response:</strong>
                              <pre className="mt-1 overflow-auto">
                                {JSON.stringify(log.response_data, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </details>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Configuration Tab */}
          {activeTab === 'config' && (
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">Connector Configuration</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-2">
                  Configuration details are encrypted and cannot be displayed for security
                  reasons.
                </p>
                <p className="text-sm text-gray-600">
                  To modify the configuration, please delete this connector and create a new one
                  with updated settings.
                </p>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Created</p>
                  <p className="text-sm font-semibold">
                    {new Date(connector.created_at).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Last Updated</p>
                  <p className="text-sm font-semibold">
                    {new Date(connector.updated_at).toLocaleString()}
                  </p>
                </div>
                {connector.last_tested_at && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Last Tested</p>
                    <p className="text-sm font-semibold">
                      {new Date(connector.last_tested_at).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConnectorDetails;
