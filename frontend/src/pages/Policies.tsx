import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiService } from '../services/api';

const Policies: React.FC = () => {
  const [policies, setPolicies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadPolicies();
  }, [filter]);

  const loadPolicies = async () => {
    try {
      const params = filter !== 'all' ? { status: filter } : {};
      const response = await apiService.getPolicies(params);

      if (response.success) {
        setPolicies(response.data);
      }
    } catch (error) {
      console.error('Failed to load policies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async (id: string) => {
    if (!confirm('Are you sure you want to activate this policy?')) return;

    try {
      await apiService.activatePolicy(id);
      loadPolicies();
    } catch (error) {
      console.error('Failed to activate policy:', error);
      alert('Failed to activate policy');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this policy?')) return;

    try {
      await apiService.deletePolicy(id);
      loadPolicies();
    } catch (error) {
      console.error('Failed to delete policy:', error);
      alert('Failed to delete policy');
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
        <h1 className="text-3xl font-bold text-gray-900">Policies</h1>
        <Link to="/policies/new" className="btn btn-primary">
          + Create New Policy
        </Link>
      </div>

      {/* Filters */}
      <div className="flex space-x-4">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-md ${filter === 'all' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700'}`}
        >
          All
        </button>
        <button
          onClick={() => setFilter('active')}
          className={`px-4 py-2 rounded-md ${filter === 'active' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700'}`}
        >
          Active
        </button>
        <button
          onClick={() => setFilter('draft')}
          className={`px-4 py-2 rounded-md ${filter === 'draft' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700'}`}
        >
          Draft
        </button>
      </div>

      {/* Policies List */}
      {policies.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500 text-lg mb-4">No policies found</p>
          <Link to="/policies/new" className="btn btn-primary">
            Create your first policy
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {policies.map((policy) => (
            <div key={policy.id} className="card hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{policy.name}</h3>
                  <p className="text-sm text-gray-500">{policy.product_type}</p>
                </div>
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full ${
                    policy.status === 'active'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {policy.status}
                </span>
              </div>

              <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                {policy.description || 'No description'}
              </p>

              <div className="text-xs text-gray-500 mb-4">
                Created: {new Date(policy.created_at).toLocaleDateString()}
              </div>

              <div className="flex space-x-2">
                <Link
                  to={`/policies/${policy.id}/edit`}
                  className="btn btn-secondary text-sm flex-1"
                >
                  Edit
                </Link>
                {policy.status !== 'active' && (
                  <button
                    onClick={() => handleActivate(policy.id)}
                    className="btn btn-primary text-sm flex-1"
                  >
                    Activate
                  </button>
                )}
                <button
                  onClick={() => handleDelete(policy.id)}
                  className="btn btn-danger text-sm"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Policies;
