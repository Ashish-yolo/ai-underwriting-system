import React, { useState, useEffect } from 'react';
import {
  PlusIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  ChartBarIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import { connectorApi, Connector } from '../services/connectorApi';
import ConnectorForm from '../components/connectors/ConnectorForm';
import ConnectorDetails from '../components/connectors/ConnectorDetails';

const Connectors: React.FC = () => {
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedConnector, setSelectedConnector] = useState<Connector | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    loadConnectors();
  }, []);

  const loadConnectors = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await connectorApi.getAll();
      setConnectors(data);
    } catch (err: any) {
      console.error('Failed to load connectors:', err);
      if (err.response?.status === 401) {
        setError('You need to be logged in to view connectors.');
      } else {
        setError(err.message || 'Failed to load connectors');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async (id: string) => {
    try {
      const result = await connectorApi.test(id);
      if (result.success) {
        alert(`Connection successful! Response time: ${result.response_time_ms}ms`);
        loadConnectors();
      } else {
        alert(`Connection failed: ${result.error}`);
      }
    } catch (err: any) {
      alert(`Test failed: ${err.message}`);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete connector "${name}"?`)) {
      return;
    }

    try {
      await connectorApi.delete(id);
      alert('Connector deleted successfully');
      loadConnectors();
    } catch (err: any) {
      alert(`Failed to delete connector: ${err.message}`);
    }
  };

  const handleToggleActive = async (connector: Connector) => {
    try {
      await connectorApi.update(connector.id, {
        is_active: !connector.is_active,
      });
      loadConnectors();
    } catch (err: any) {
      alert(`Failed to toggle connector: ${err.message}`);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircleIcon className="w-5 h-5 text-red-500" />;
      case 'degraded':
        return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />;
      default:
        return <ClockIcon className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      connected: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      degraded: 'bg-yellow-100 text-yellow-800',
      not_tested: 'bg-gray-100 text-gray-800',
    };

    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${styles[status] || styles.not_tested}`}>
        {status.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  const getProtocolBadge = (protocol: string) => {
    const colors: Record<string, string> = {
      rest: 'bg-blue-100 text-blue-800',
      soap: 'bg-purple-100 text-purple-800',
      graphql: 'bg-pink-100 text-pink-800',
      grpc: 'bg-indigo-100 text-indigo-800',
      websocket: 'bg-teal-100 text-teal-800',
    };

    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${colors[protocol] || colors.rest}`}>
        {protocol.toUpperCase()}
      </span>
    );
  };

  const filteredConnectors = connectors.filter((conn) => {
    if (filterType !== 'all' && conn.type !== filterType) return false;
    if (filterStatus === 'active' && !conn.is_active) return false;
    if (filterStatus === 'inactive' && conn.is_active) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <ArrowPathIcon className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading connectors...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-red-900 mb-2">Error Loading Connectors</h2>
        <p className="text-red-700">{error}</p>
        <button
          onClick={loadConnectors}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (showCreateForm) {
    return (
      <div className="animate-fadeIn">
        <ConnectorForm
          onSuccess={() => {
            setShowCreateForm(false);
            loadConnectors();
          }}
          onCancel={() => setShowCreateForm(false)}
        />
      </div>
    );
  }

  if (selectedConnector) {
    return (
      <div className="animate-fadeIn">
        <ConnectorDetails
          connector={selectedConnector}
          onBack={() => setSelectedConnector(null)}
          onUpdate={() => {
            setSelectedConnector(null);
            loadConnectors();
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Data Connectors</h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage external API integrations with advanced resilience patterns
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={loadConnectors}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ArrowPathIcon className="w-5 h-5" />
            Refresh
          </button>
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all transform hover:scale-105 shadow-md hover:shadow-lg"
          >
            <PlusIcon className="w-5 h-5" />
            Add Connector
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 flex gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Types</option>
            <option value="bureau">Bureau</option>
            <option value="verification">Verification</option>
            <option value="database">Database</option>
            <option value="los">LOS</option>
            <option value="api">API</option>
            <option value="custom">Custom</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>

        <div className="ml-auto flex items-end">
          <div className="text-sm text-gray-600">
            Showing <span className="font-semibold">{filteredConnectors.length}</span> of{' '}
            <span className="font-semibold">{connectors.length}</span> connectors
          </div>
        </div>
      </div>

      {/* Connectors Grid */}
      {filteredConnectors.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Cog6ToothIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No connectors found</h3>
          <p className="text-gray-600 mb-4">
            {connectors.length === 0
              ? 'Get started by creating your first connector'
              : 'Try adjusting your filters'}
          </p>
          {connectors.length === 0 && (
            <button
              onClick={() => setShowCreateForm(true)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Create Connector
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredConnectors.map((connector) => (
            <div
              key={connector.id}
              className="bg-white rounded-lg shadow hover:shadow-xl transition-all duration-300 p-6 border border-gray-200 hover:border-blue-300 transform hover:-translate-y-1"
            >
              {/* Header */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-1">{connector.name}</h3>
                  {connector.description && (
                    <p className="text-sm text-gray-600 line-clamp-2">{connector.description}</p>
                  )}
                </div>
                {getStatusIcon(connector.status)}
              </div>

              {/* Metadata */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Type:</span>
                  <span className="text-sm font-medium text-gray-900 capitalize">{connector.type}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Protocol:</span>
                  {getProtocolBadge(connector.protocol)}
                </div>
                {connector.provider && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Provider:</span>
                    <span className="text-sm font-medium text-gray-900">{connector.provider}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Status:</span>
                  {getStatusBadge(connector.status)}
                </div>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Active</span>
                <button
                  onClick={() => handleToggleActive(connector)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    connector.is_active ? 'bg-green-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      connector.is_active ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedConnector(connector)}
                  className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-all transform hover:scale-105 shadow hover:shadow-md flex items-center justify-center gap-1"
                >
                  <ChartBarIcon className="w-4 h-4" />
                  Details
                </button>
                <button
                  onClick={() => handleTest(connector.id)}
                  className="px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-all transform hover:scale-105 shadow hover:shadow-md"
                  title="Test connection"
                >
                  Test
                </button>
                <button
                  onClick={() => handleDelete(connector.id, connector.name)}
                  className="px-3 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-all transform hover:scale-105 shadow hover:shadow-md"
                  title="Delete connector"
                >
                  Delete
                </button>
              </div>

              {/* Last Tested */}
              {connector.last_tested_at && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs text-gray-500">
                    Last tested: {new Date(connector.last_tested_at).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Connectors;
