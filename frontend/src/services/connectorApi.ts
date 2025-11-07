import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api/connectors`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface Connector {
  id: string;
  name: string;
  description?: string;
  type: 'bureau' | 'verification' | 'database' | 'los' | 'api' | 'custom';
  provider?: string;
  protocol: 'rest' | 'soap' | 'graphql' | 'grpc' | 'websocket';
  is_active: boolean;
  status: 'connected' | 'failed' | 'not_tested' | 'degraded';
  created_at: string;
  updated_at: string;
  last_tested_at?: string;
}

export interface ConnectorConfig {
  api_url: string;
  protocol?: string;
  auth_type?: 'api_key' | 'bearer' | 'basic' | 'oauth2' | 'jwt' | 'mtls' | 'none';
  credentials?: any;
  timeout?: number;
  retry_count?: number;
  cache_ttl?: number;
  headers?: Record<string, string>;
  params?: Record<string, any>;
  circuitBreaker?: {
    enabled: boolean;
    failureThreshold?: number;
    successThreshold?: number;
    timeoutDurationMs?: number;
  };
  rateLimit?: {
    enabled: boolean;
    requestsPerSecond?: number;
    requestsPerMinute?: number;
    requestsPerHour?: number;
    requestsPerDay?: number;
  };
  transformation?: {
    enabled: boolean;
  };
}

export interface ConnectorHealth {
  total_calls: number;
  success_count: number;
  error_count: number;
  success_rate: number;
  avg_response_time_ms: number;
  last_24h_calls: number;
  cache_hit_rate?: number;
}

export interface CircuitBreakerStatus {
  state: 'closed' | 'open' | 'half_open';
  failureCount: number;
  successCount: number;
  consecutiveFailures: number;
  lastFailureAt?: string;
  lastSuccessAt?: string;
}

export interface RateLimitStatus {
  minute: { count: number; limit: number; remaining: number };
  hour: { count: number; limit: number; remaining: number };
  day: { count: number; limit: number; remaining: number };
}

export interface ConnectorLog {
  id: string;
  request_data: any;
  response_data: any;
  status_code: number;
  error_message?: string;
  execution_time_ms: number;
  cache_hit?: boolean;
  created_at: string;
}

export const connectorApi = {
  // CRUD operations
  getAll: async (filters?: { type?: string; is_active?: boolean }): Promise<Connector[]> => {
    const response = await api.get('/', { params: filters });
    return response.data.data.connectors;
  },

  getById: async (id: string): Promise<Connector> => {
    const response = await api.get(`/${id}`);
    return response.data.data.connector;
  },

  create: async (data: {
    name: string;
    type: string;
    protocol: string;
    config: ConnectorConfig;
    description?: string;
    provider?: string;
  }): Promise<Connector> => {
    const response = await api.post('/', data);
    return response.data.data.connector;
  },

  update: async (
    id: string,
    updates: {
      name?: string;
      config?: ConnectorConfig;
      is_active?: boolean;
    }
  ): Promise<void> => {
    await api.put(`/${id}`, updates);
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/${id}`);
  },

  // Testing
  test: async (id: string): Promise<{
    success: boolean;
    response_time_ms: number;
    error?: string;
    circuitBreakerStatus?: CircuitBreakerStatus;
    rateLimitStatus?: RateLimitStatus;
  }> => {
    const response = await api.post(`/${id}/test`);
    return response.data.data;
  },

  // Monitoring
  getHealth: async (id: string): Promise<ConnectorHealth> => {
    const response = await api.get(`/${id}/health`);
    return response.data.data;
  },

  getLogs: async (id: string, limit: number = 100): Promise<ConnectorLog[]> => {
    const response = await api.get(`/${id}/logs`, { params: { limit } });
    return response.data.data.logs;
  },

  // Circuit Breaker
  getCircuitBreakerStatus: async (id: string): Promise<CircuitBreakerStatus> => {
    const response = await api.get(`/${id}/circuit-breaker`);
    return response.data.data;
  },

  resetCircuitBreaker: async (id: string): Promise<void> => {
    await api.post(`/${id}/circuit-breaker/reset`);
  },

  // Rate Limiting
  getRateLimitStatus: async (id: string): Promise<RateLimitStatus> => {
    const response = await api.get(`/${id}/rate-limit`);
    return response.data.data;
  },

  resetRateLimit: async (id: string): Promise<void> => {
    await api.post(`/${id}/rate-limit/reset`);
  },

  updateRateLimit: async (
    id: string,
    config: {
      requestsPerSecond?: number;
      requestsPerMinute?: number;
      requestsPerHour?: number;
      requestsPerDay?: number;
    }
  ): Promise<void> => {
    await api.put(`/${id}/rate-limit`, config);
  },

  // Transformations
  getTransformations: async (id: string): Promise<any[]> => {
    const response = await api.get(`/${id}/transformations`);
    return response.data.data.transformations;
  },

  createTransformation: async (id: string, rule: any): Promise<string> => {
    const response = await api.post(`/${id}/transformations`, rule);
    return response.data.data.ruleId;
  },

  deleteTransformation: async (ruleId: string): Promise<void> => {
    await api.delete(`/transformations/${ruleId}`);
  },
};
