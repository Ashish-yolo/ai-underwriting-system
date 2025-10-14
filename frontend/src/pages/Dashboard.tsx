import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiService } from '../services/api';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [realtimeMetrics, setRealtimeMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadRealtimeMetrics, 10000); // Refresh every 10 seconds

    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      const [overviewData, realtimeData] = await Promise.all([
        apiService.getOverviewAnalytics(),
        apiService.getRealtimeMetrics(),
      ]);

      if (overviewData.success) {
        setStats(overviewData.data);
      }

      if (realtimeData.success) {
        setRealtimeMetrics(realtimeData.data);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRealtimeMetrics = async () => {
    try {
      const response = await apiService.getRealtimeMetrics();
      if (response.success) {
        setRealtimeMetrics(response.data);
      }
    } catch (error) {
      console.error('Failed to load realtime metrics:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <div className="text-sm text-gray-500">
          Last updated: {realtimeMetrics?.timestamp ? new Date(realtimeMetrics.timestamp).toLocaleTimeString() : 'N/A'}
        </div>
      </div>

      {/* Real-time Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Applications (Last Hour)</p>
              <p className="text-3xl font-bold text-blue-900">
                {realtimeMetrics?.applications_last_hour || 0}
              </p>
            </div>
            <div className="text-4xl">📊</div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-green-50 to-green-100 border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Active Reviews</p>
              <p className="text-3xl font-bold text-green-900">
                {realtimeMetrics?.active_reviews || 0}
              </p>
            </div>
            <div className="text-4xl">👥</div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-red-50 to-red-100 border border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-600">Overdue Reviews</p>
              <p className="text-3xl font-bold text-red-900">
                {realtimeMetrics?.overdue_reviews || 0}
              </p>
            </div>
            <div className="text-4xl">⏰</div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600">Last 5 Minutes</p>
              <p className="text-3xl font-bold text-purple-900">
                {realtimeMetrics?.applications_last_5min || 0}
              </p>
            </div>
            <div className="text-4xl">⚡</div>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      {stats?.summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="card">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Total Applications</h3>
            <p className="text-2xl font-bold text-gray-900">{stats.summary.total_applications}</p>
          </div>

          <div className="card">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Approved</h3>
            <p className="text-2xl font-bold text-green-600">{stats.summary.approved_count}</p>
            <p className="text-sm text-gray-500">{stats.summary.approval_rate}%</p>
          </div>

          <div className="card">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Rejected</h3>
            <p className="text-2xl font-bold text-red-600">{stats.summary.rejected_count}</p>
            <p className="text-sm text-gray-500">{stats.summary.rejection_rate}%</p>
          </div>

          <div className="card">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Manual Review</h3>
            <p className="text-2xl font-bold text-yellow-600">{stats.summary.manual_review_count}</p>
            <p className="text-sm text-gray-500">{stats.summary.manual_review_rate}%</p>
          </div>
        </div>
      )}

      {/* Performance Stats */}
      {stats?.summary && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Performance</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600">Average Execution Time</p>
              <p className="text-xl font-semibold text-gray-900">
                {stats.summary.avg_execution_time_ms}ms
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Max Execution Time</p>
              <p className="text-xl font-semibold text-gray-900">
                {stats.summary.max_execution_time_ms}ms
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Min Execution Time</p>
              <p className="text-xl font-semibold text-gray-900">
                {stats.summary.min_execution_time_ms}ms
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Top Policies */}
      {stats?.policy_usage && stats.policy_usage.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Policies by Usage</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Policy Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Requests
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Approved
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stats.policy_usage.slice(0, 5).map((policy: any) => (
                  <tr key={policy.id}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {policy.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {policy.request_count}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {policy.approved_count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link to="/policies/new" className="card hover:shadow-lg transition-shadow cursor-pointer">
          <div className="text-center">
            <div className="text-4xl mb-2">➕</div>
            <h3 className="font-semibold text-gray-900">Create New Policy</h3>
            <p className="text-sm text-gray-500 mt-1">Build a new underwriting policy</p>
          </div>
        </Link>

        <Link to="/manual-review" className="card hover:shadow-lg transition-shadow cursor-pointer">
          <div className="text-center">
            <div className="text-4xl mb-2">👥</div>
            <h3 className="font-semibold text-gray-900">Manual Review Queue</h3>
            <p className="text-sm text-gray-500 mt-1">Review pending applications</p>
          </div>
        </Link>

        <Link to="/analytics" className="card hover:shadow-lg transition-shadow cursor-pointer">
          <div className="text-center">
            <div className="text-4xl mb-2">📈</div>
            <h3 className="font-semibold text-gray-900">View Analytics</h3>
            <p className="text-sm text-gray-500 mt-1">Analyze system performance</p>
          </div>
        </Link>
      </div>
    </div>
  );
};

export default Dashboard;
