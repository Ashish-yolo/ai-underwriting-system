import React from 'react';

const Analytics: React.FC = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>

      <div className="card">
        <p className="text-gray-600">
          Analytics dashboard with charts and visualizations will be implemented here.
        </p>
        <p className="text-sm text-gray-500 mt-4">
          Features: Decision trends, policy performance, connector health, reviewer stats, exports
        </p>
      </div>
    </div>
  );
};

export default Analytics;
