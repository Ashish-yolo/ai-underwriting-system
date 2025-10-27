import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api/analytics`,
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

export interface DailyTrendData {
  date: string;
  totalApplications: number;
  approvedCount: number;
  approvalRate: number;
}

export interface FunnelData {
  stage: string;
  value: number;
  percentage: number;
}

export interface CreditScoreBandData {
  scoreBand: string;
  totalApplications: number;
  approvedCount: number;
  approvalRate: number;
}

export interface StrategyStats {
  name: string;
  applicationsProcessed: number;
  approvalRate: number;
  avgCreditScore: number;
  avgTatMs: number;
}

export interface StrategyPerformanceData {
  champion: StrategyStats | null;
  challenger: StrategyStats | null;
}

export interface DecisionSplitData {
  name: string;
  value: number;
  percentage: number;
}

export interface DashboardAnalytics {
  dailyTrend: DailyTrendData[];
  funnel: FunnelData[];
  creditScoreBands: CreditScoreBandData[];
  strategyPerformance: StrategyPerformanceData;
  decisionSplit: DecisionSplitData[];
}

export const analyticsApi = {
  // Get all dashboard analytics
  getDashboard: async (): Promise<DashboardAnalytics> => {
    const response = await api.get('/dashboard');
    return response.data.data;
  },

  // Get daily trend
  getDailyTrend: async (days: number = 30): Promise<DailyTrendData[]> => {
    const response = await api.get('/daily-trend', { params: { days } });
    return response.data.data;
  },

  // Get application funnel
  getFunnel: async (): Promise<FunnelData[]> => {
    const response = await api.get('/funnel');
    return response.data.data;
  },

  // Get credit score bands
  getCreditScoreBands: async (): Promise<CreditScoreBandData[]> => {
    const response = await api.get('/credit-score-bands');
    return response.data.data;
  },

  // Get strategy performance
  getStrategyPerformance: async (): Promise<StrategyPerformanceData> => {
    const response = await api.get('/strategy-performance');
    return response.data.data;
  },

  // Get decision split
  getDecisionSplit: async (): Promise<DecisionSplitData[]> => {
    const response = await api.get('/decision-split');
    return response.data.data;
  },
};
