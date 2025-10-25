import React, { useState, useEffect } from 'react';
import {
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from 'recharts';
import { analyticsApi, DashboardAnalytics } from '../services/analyticsApi';
import {
  ChartBarIcon,
  ArrowTrendingUpIcon,
  FunnelIcon,
  ScaleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

const Analytics: React.FC = () => {
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await analyticsApi.getDashboard();
      setAnalytics(data);
    } catch (err: any) {
      console.error('Failed to load analytics:', err);
      setError(err.message || 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <ArrowPathIcon className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-red-900 mb-2">Error Loading Analytics</h2>
        <p className="text-red-700">{error}</p>
        <button
          onClick={loadAnalytics}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No analytics data available</p>
      </div>
    );
  }

  const COLORS = {
    primary: '#3B82F6',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    purple: '#8B5CF6',
    teal: '#14B8A6',
    pink: '#EC4899',
    indigo: '#6366F1',
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-sm text-gray-600 mt-1">
            Comprehensive view of underwriting performance and trends
          </p>
        </div>
        <button
          onClick={loadAnalytics}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <ArrowPathIcon className="w-5 h-5" />
          Refresh
        </button>
      </div>

      {/* Graph 1: Daily Application Volume & Approval Trend */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center gap-2 mb-4">
          <ChartBarIcon className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-bold text-gray-900">
            Daily Application Volume & Approval Trend
          </h2>
        </div>
        <ResponsiveContainer width="100%" height={350}>
          <ComposedChart data={analytics.dailyTrend}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickFormatter={(value) => new Date(value).toLocaleDateString()}
            />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip
              labelFormatter={(value) => new Date(value).toLocaleDateString()}
              formatter={(value: any, name: string) => {
                if (name === 'Approval Rate') return [`${value}%`, name];
                return [value, name];
              }}
            />
            <Legend />
            <Bar
              yAxisId="left"
              dataKey="totalApplications"
              fill={COLORS.primary}
              name="Total Applications"
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="approvalRate"
              stroke={COLORS.success}
              strokeWidth={3}
              name="Approval Rate"
              dot={{ r: 4 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Graph 2: Application Funnel */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center gap-2 mb-4">
          <FunnelIcon className="w-6 h-6 text-purple-600" />
          <h2 className="text-xl font-bold text-gray-900">Application Funnel</h2>
        </div>
        <div className="grid grid-cols-5 gap-4">
          {analytics.funnel.map((stage) => (
            <div
              key={stage.stage}
              className="text-center p-4 bg-gradient-to-b from-blue-50 to-white rounded-lg border-2 border-blue-200"
            >
              <div className="text-3xl font-bold text-blue-600 mb-2">{stage.value}</div>
              <div className="text-sm font-semibold text-gray-900 mb-1">{stage.stage}</div>
              <div className="text-xs text-gray-600">{stage.percentage}%</div>
            </div>
          ))}
        </div>
        <ResponsiveContainer width="100%" height={250} className="mt-6">
          <BarChart data={analytics.funnel} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="stage" type="category" width={150} />
            <Tooltip />
            <Bar dataKey="value" fill={COLORS.purple} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Graphs 3, 4, 5 in a row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Graph 3: Approval Rate by Credit Score Band */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center gap-2 mb-4">
            <ScaleIcon className="w-6 h-6 text-teal-600" />
            <h2 className="text-lg font-bold text-gray-900">
              Approval Rate by Credit Score
            </h2>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.creditScoreBands}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="scoreBand" />
              <YAxis />
              <Tooltip formatter={(value: any) => `${value}%`} />
              <Legend />
              <Bar dataKey="approvalRate" fill={COLORS.teal} name="Approval Rate (%)" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Graph 5: Manual vs Auto Decision Split */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center gap-2 mb-4">
            <ArrowTrendingUpIcon className="w-6 h-6 text-pink-600" />
            <h2 className="text-lg font-bold text-gray-900">
              Manual vs Auto Decision Split
            </h2>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={analytics.decisionSplit}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percentage }) => `${name}: ${percentage}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {analytics.decisionSplit.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      [COLORS.success, COLORS.danger, COLORS.warning, COLORS.purple][
                        index % 4
                      ]
                    }
                  />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Graph 4: Champion vs Challenger Strategy Performance */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center gap-2 mb-6">
          <ChartBarIcon className="w-6 h-6 text-indigo-600" />
          <h2 className="text-xl font-bold text-gray-900">
            Champion vs Challenger Strategy Performance
          </h2>
        </div>

        {analytics.strategyPerformance.champion && analytics.strategyPerformance.challenger ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Champion Card */}
            <div className="border-2 border-green-500 rounded-lg p-6 bg-green-50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-green-900">
                  🏆 Champion Strategy
                </h3>
                <span className="px-3 py-1 bg-green-600 text-white rounded-full text-xs font-semibold">
                  ACTIVE
                </span>
              </div>
              <p className="text-2xl font-bold text-green-900 mb-4">
                {analytics.strategyPerformance.champion.name}
              </p>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-700">Applications Processed:</span>
                  <span className="text-lg font-bold text-gray-900">
                    {analytics.strategyPerformance.champion.applicationsProcessed.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-700">Approval Rate:</span>
                  <span className="text-lg font-bold text-green-600">
                    {analytics.strategyPerformance.champion.approvalRate}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-700">Avg Credit Score:</span>
                  <span className="text-lg font-bold text-gray-900">
                    {analytics.strategyPerformance.champion.avgCreditScore}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-700">Avg TAT:</span>
                  <span className="text-lg font-bold text-gray-900">
                    {analytics.strategyPerformance.champion.avgTatMs}ms
                  </span>
                </div>
              </div>
            </div>

            {/* Challenger Card */}
            <div className="border-2 border-blue-500 rounded-lg p-6 bg-blue-50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-blue-900">
                  🔬 Challenger Strategy
                </h3>
                <span className="px-3 py-1 bg-blue-600 text-white rounded-full text-xs font-semibold">
                  TESTING
                </span>
              </div>
              <p className="text-2xl font-bold text-blue-900 mb-4">
                {analytics.strategyPerformance.challenger.name}
              </p>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-700">Applications Processed:</span>
                  <span className="text-lg font-bold text-gray-900">
                    {analytics.strategyPerformance.challenger.applicationsProcessed.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-700">Approval Rate:</span>
                  <span className="text-lg font-bold text-blue-600">
                    {analytics.strategyPerformance.challenger.approvalRate}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-700">Avg Credit Score:</span>
                  <span className="text-lg font-bold text-gray-900">
                    {analytics.strategyPerformance.challenger.avgCreditScore}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-700">Avg TAT:</span>
                  <span className="text-lg font-bold text-gray-900">
                    {analytics.strategyPerformance.challenger.avgTatMs}ms
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-600">
              Not enough policies to show champion vs challenger comparison.
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Create at least 2 active policies to see this comparison.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Analytics;
