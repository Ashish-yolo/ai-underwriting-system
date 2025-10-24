import axios, { AxiosInstance } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor to handle errors
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Unauthorized - clear token and redirect to login
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth endpoints
  async login(email: string, password: string) {
    const response = await this.api.post('/auth/login', { email, password });
    return response.data;
  }

  async register(data: any) {
    const response = await this.api.post('/auth/register', data);
    return response.data;
  }

  async logout() {
    const response = await this.api.post('/auth/logout');
    return response.data;
  }

  async getMe() {
    const response = await this.api.get('/auth/me');
    return response.data;
  }

  async changePassword(currentPassword: string, newPassword: string) {
    const response = await this.api.post('/auth/change-password', {
      currentPassword,
      newPassword,
    });
    return response.data;
  }

  // Policy endpoints
  async getPolicies(params?: any) {
    const response = await this.api.get('/policies', { params });
    return response.data;
  }

  async getPolicy(id: string) {
    const response = await this.api.get(`/policies/${id}`);
    return response.data;
  }

  async createPolicy(data: any) {
    const response = await this.api.post('/policies', data);
    return response.data;
  }

  async updatePolicy(id: string, data: any) {
    const response = await this.api.put(`/policies/${id}`, data);
    return response.data;
  }

  async deletePolicy(id: string) {
    const response = await this.api.delete(`/policies/${id}`);
    return response.data;
  }

  async activatePolicy(id: string) {
    const response = await this.api.post(`/policies/${id}/activate`);
    return response.data;
  }

  async clonePolicy(id: string, name: string, description?: string) {
    const response = await this.api.post(`/policies/${id}/clone`, { name, description });
    return response.data;
  }

  async testPolicy(id: string, testData: any) {
    const response = await this.api.post(`/policies/${id}/test`, { test_data: testData });
    return response.data;
  }

  async getPolicyStats(id: string, params?: any) {
    const response = await this.api.get(`/policies/${id}/stats`, { params });
    return response.data;
  }

  // Connector endpoints
  async getConnectors(params?: any) {
    const response = await this.api.get('/connectors', { params });
    return response.data;
  }

  async getConnector(id: string) {
    const response = await this.api.get(`/connectors/${id}`);
    return response.data;
  }

  async createConnector(data: any) {
    const response = await this.api.post('/connectors', data);
    return response.data;
  }

  async updateConnector(id: string, data: any) {
    const response = await this.api.put(`/connectors/${id}`, data);
    return response.data;
  }

  async deleteConnector(id: string) {
    const response = await this.api.delete(`/connectors/${id}`);
    return response.data;
  }

  async testConnector(id: string) {
    const response = await this.api.post(`/connectors/${id}/test`);
    return response.data;
  }

  // Manual Review endpoints
  async getManualReviews(params?: any) {
    const response = await this.api.get('/manual-review', { params });
    return response.data;
  }

  async getManualReview(id: string) {
    const response = await this.api.get(`/manual-review/${id}`);
    return response.data;
  }

  async assignReview(id: string, userId: string) {
    const response = await this.api.put(`/manual-review/${id}/assign`, { userId });
    return response.data;
  }

  async completeReview(id: string, data: any) {
    const response = await this.api.post(`/manual-review/${id}/complete`, data);
    return response.data;
  }

  async addReviewComment(id: string, comment: string) {
    const response = await this.api.post(`/manual-review/${id}/comment`, { comment });
    return response.data;
  }

  async getReviewStats(params?: any) {
    const response = await this.api.get('/manual-review/dashboard/stats', { params });
    return response.data;
  }

  // Testing endpoints
  async getTestCases(params?: any) {
    const response = await this.api.get('/testing/cases', { params });
    return response.data;
  }

  async getTestCase(id: string) {
    const response = await this.api.get(`/testing/cases/${id}`);
    return response.data;
  }

  async createTestCase(data: any) {
    const response = await this.api.post('/testing/cases', data);
    return response.data;
  }

  async updateTestCase(id: string, data: any) {
    const response = await this.api.put(`/testing/cases/${id}`, data);
    return response.data;
  }

  async deleteTestCase(id: string) {
    const response = await this.api.delete(`/testing/cases/${id}`);
    return response.data;
  }

  async runTestCase(id: string) {
    const response = await this.api.post(`/testing/cases/${id}/run`);
    return response.data;
  }

  async runAllTests(policyId: string) {
    const response = await this.api.post(`/testing/policies/${policyId}/run-all`);
    return response.data;
  }

  async getTestResults(params?: any) {
    const response = await this.api.get('/testing/results', { params });
    return response.data;
  }

  async getTestStats(policyId: string) {
    const response = await this.api.get(`/testing/policies/${policyId}/stats`);
    return response.data;
  }

  // Analytics endpoints
  async getOverviewAnalytics(params?: any) {
    const response = await this.api.get('/analytics/overview', { params });
    return response.data;
  }

  async getPolicyAnalytics(policyId: string, params?: any) {
    const response = await this.api.get(`/analytics/policies/${policyId}`, { params });
    return response.data;
  }

  async getManualReviewAnalytics(params?: any) {
    const response = await this.api.get('/analytics/manual-reviews', { params });
    return response.data;
  }

  async getConnectorAnalytics(params?: any) {
    const response = await this.api.get('/analytics/connectors', { params });
    return response.data;
  }

  async getRealtimeMetrics() {
    const response = await this.api.get('/analytics/realtime');
    return response.data;
  }

  async exportAnalytics(type: string, params?: any) {
    const response = await this.api.get('/analytics/export', {
      params: { type, ...params },
    });
    return response.data;
  }
}

export const apiService = new ApiService();
export default apiService;
