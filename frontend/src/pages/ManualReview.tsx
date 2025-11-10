import React, { useEffect, useState } from 'react';
import {
  ClockIcon,
  UserIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { apiService } from '../services/api';

interface ManualReview {
  id: string;
  application_id: string;
  underwriting_id: string;
  policy_id: string;
  policy_name: string;
  applicant_data: any;
  review_reason: string;
  status: 'pending' | 'in_review' | 'approved' | 'rejected';
  priority: 'urgent' | 'high' | 'medium' | 'low';
  assigned_to: string | null;
  assigned_to_name: string | null;
  reviewed_by: string | null;
  reviewed_by_name: string | null;
  reviewed_at: string | null;
  review_decision: 'approved' | 'rejected' | null;
  review_notes: string | null;
  sla_deadline: string;
  created_at: string;
}

interface Stats {
  total_reviews: number;
  pending_count: number;
  in_review_count: number;
  approved_count: number;
  rejected_count: number;
  urgent_count: number;
  overdue_count: number;
}

const ManualReview: React.FC = () => {
  const [reviews, setReviews] = useState<ManualReview[]>([]);
  const [stats, setStats] = useState<Stats>({
    total_reviews: 0,
    pending_count: 0,
    in_review_count: 0,
    approved_count: 0,
    rejected_count: 0,
    urgent_count: 0,
    overdue_count: 0,
  });
  const [loading, setLoading] = useState(true);
  const [selectedReview, setSelectedReview] = useState<ManualReview | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [decisionForm, setDecisionForm] = useState({
    decision: 'approved' as 'approved' | 'rejected',
    notes: '',
    approvedAmount: '',
    interestRate: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchReviews();
    fetchStats();
    // Refresh every 30 seconds
    const interval = setInterval(() => {
      fetchReviews();
      fetchStats();
    }, 30000);
    return () => clearInterval(interval);
  }, [filterStatus, filterPriority]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (filterStatus !== 'all') params.status = filterStatus;
      if (filterPriority !== 'all') params.priority = filterPriority;

      const response = await apiService.getManualReviews(params);
      setReviews(response.data || []);
    } catch (error: any) {
      console.error('Failed to fetch reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await apiService.getReviewStats();
      setStats(response.data || stats);
    } catch (error: any) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const handleReviewClick = (review: ManualReview) => {
    setSelectedReview(review);
  };

  const handleAssignToMe = async (reviewId: string) => {
    try {
      // Get current user ID from localStorage or auth context
      const userId = localStorage.getItem('user_id') || '00000000-0000-0000-0000-000000000001';
      await apiService.assignReview(reviewId, userId);
      fetchReviews();
      fetchStats();
    } catch (error: any) {
      console.error('Failed to assign review:', error);
      alert('Failed to assign review: ' + error.message);
    }
  };

  const handleSubmitDecision = async () => {
    if (!selectedReview) return;

    if (!decisionForm.notes.trim()) {
      alert('Please provide review notes');
      return;
    }

    try {
      setSubmitting(true);
      await apiService.completeReview(selectedReview.id, {
        decision: decisionForm.decision,
        notes: decisionForm.notes,
        approvedAmount: decisionForm.approvedAmount ? parseFloat(decisionForm.approvedAmount) : undefined,
        interestRate: decisionForm.interestRate ? parseFloat(decisionForm.interestRate) : undefined,
      });

      setShowDecisionModal(false);
      setSelectedReview(null);
      setDecisionForm({
        decision: 'approved',
        notes: '',
        approvedAmount: '',
        interestRate: '',
      });
      fetchReviews();
      fetchStats();
      alert('Review submitted successfully!');
    } catch (error: any) {
      console.error('Failed to submit decision:', error);
      alert('Failed to submit decision: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'in_review':
        return 'bg-blue-100 text-blue-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const isOverdue = (slaDeadline: string) => {
    return new Date(slaDeadline) < new Date();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Manual Review Queue</h1>
          <p className="text-gray-600 mt-1">Review and process applications requiring manual attention</p>
        </div>
        <button
          onClick={() => {
            fetchReviews();
            fetchStats();
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <ArrowPathIcon className="w-5 h-5" />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card bg-yellow-50 border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.pending_count}</p>
            </div>
            <ExclamationTriangleIcon className="w-8 h-8 text-yellow-600" />
          </div>
        </div>

        <div className="card bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">In Review</p>
              <p className="text-2xl font-bold text-blue-600">{stats.in_review_count}</p>
            </div>
            <UserIcon className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="card bg-green-50 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Approved</p>
              <p className="text-2xl font-bold text-green-600">{stats.approved_count}</p>
            </div>
            <CheckCircleIcon className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="card bg-red-50 border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Rejected</p>
              <p className="text-2xl font-bold text-red-600">{stats.rejected_count}</p>
            </div>
            <XCircleIcon className="w-8 h-8 text-red-600" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="input w-40"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="in_review">In Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="input w-40"
            >
              <option value="all">All Priority</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {stats.urgent_count > 0 && (
            <div className="flex items-end">
              <div className="px-4 py-2 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm font-medium text-red-800">
                  {stats.urgent_count} Urgent {stats.urgent_count === 1 ? 'Case' : 'Cases'}
                </p>
              </div>
            </div>
          )}

          {stats.overdue_count > 0 && (
            <div className="flex items-end">
              <div className="px-4 py-2 bg-red-100 border border-red-300 rounded-lg">
                <p className="text-sm font-medium text-red-900">
                  {stats.overdue_count} Overdue
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reviews List */}
      <div className="card">
        {loading ? (
          <div className="text-center py-12">
            <ArrowPathIcon className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading reviews...</p>
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-12">
            <ExclamationTriangleIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No reviews found matching your filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Application
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reason
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    SLA Deadline
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Assigned To
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reviews.map((review) => (
                  <tr
                    key={review.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleReviewClick(review)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{review.application_id}</p>
                        <p className="text-xs text-gray-500">{review.policy_name}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getPriorityColor(review.priority)}`}>
                        {review.priority.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(review.status)}`}>
                        {review.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-900 max-w-md truncate">{review.review_reason}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <ClockIcon className={`w-4 h-4 ${isOverdue(review.sla_deadline) ? 'text-red-600' : 'text-gray-400'}`} />
                        <span className={`text-sm ${isOverdue(review.sla_deadline) ? 'text-red-600 font-semibold' : 'text-gray-900'}`}>
                          {formatDate(review.sla_deadline)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-sm text-gray-900">
                        {review.assigned_to_name || '-'}
                      </p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex gap-2">
                        {review.status === 'pending' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAssignToMe(review.id);
                            }}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Assign to Me
                          </button>
                        )}
                        {review.status === 'in_review' && !review.reviewed_by && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedReview(review);
                              setShowDecisionModal(true);
                            }}
                            className="text-green-600 hover:text-green-900"
                          >
                            Submit Decision
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Review Details Modal */}
      {selectedReview && !showDecisionModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-[800px] shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Review Details</h3>
              <button
                onClick={() => setSelectedReview(null)}
                className="text-gray-400 hover:text-gray-500"
              >
                <XCircleIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Application ID</label>
                  <p className="text-sm text-gray-900">{selectedReview.application_id}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Policy</label>
                  <p className="text-sm text-gray-900">{selectedReview.policy_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Priority</label>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getPriorityColor(selectedReview.priority)}`}>
                    {selectedReview.priority.toUpperCase()}
                  </span>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Status</label>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedReview.status)}`}>
                    {selectedReview.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600">Review Reason</label>
                <p className="text-sm text-gray-900 mt-1 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  {selectedReview.review_reason}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600">Applicant Data</label>
                <pre className="text-xs text-gray-900 mt-1 p-3 bg-gray-50 rounded-lg border border-gray-200 overflow-x-auto">
                  {JSON.stringify(selectedReview.applicant_data, null, 2)}
                </pre>
              </div>

              {selectedReview.review_notes && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Review Notes</label>
                  <p className="text-sm text-gray-900 mt-1 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    {selectedReview.review_notes}
                  </p>
                </div>
              )}

              {selectedReview.reviewed_by_name && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Reviewed By</label>
                    <p className="text-sm text-gray-900">{selectedReview.reviewed_by_name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Reviewed At</label>
                    <p className="text-sm text-gray-900">{selectedReview.reviewed_at ? formatDate(selectedReview.reviewed_at) : '-'}</p>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  onClick={() => setSelectedReview(null)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Close
                </button>
                {selectedReview.status === 'pending' && (
                  <button
                    onClick={() => handleAssignToMe(selectedReview.id)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Assign to Me
                  </button>
                )}
                {selectedReview.status === 'in_review' && !selectedReview.reviewed_by && (
                  <button
                    onClick={() => setShowDecisionModal(true)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Submit Decision
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Decision Modal */}
      {showDecisionModal && selectedReview && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-[600px] shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Submit Review Decision</h3>
              <button
                onClick={() => {
                  setShowDecisionModal(false);
                  setDecisionForm({ decision: 'approved', notes: '', approvedAmount: '', interestRate: '' });
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                <XCircleIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Decision *</label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="decision"
                      value="approved"
                      checked={decisionForm.decision === 'approved'}
                      onChange={(e) => setDecisionForm({ ...decisionForm, decision: e.target.value as 'approved' })}
                      className="mr-2"
                    />
                    <CheckCircleIcon className="w-5 h-5 text-green-600 mr-1" />
                    <span>Approve</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="decision"
                      value="rejected"
                      checked={decisionForm.decision === 'rejected'}
                      onChange={(e) => setDecisionForm({ ...decisionForm, decision: e.target.value as 'rejected' })}
                      className="mr-2"
                    />
                    <XCircleIcon className="w-5 h-5 text-red-600 mr-1" />
                    <span>Reject</span>
                  </label>
                </div>
              </div>

              {decisionForm.decision === 'approved' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Approved Amount (Optional)
                    </label>
                    <input
                      type="number"
                      value={decisionForm.approvedAmount}
                      onChange={(e) => setDecisionForm({ ...decisionForm, approvedAmount: e.target.value })}
                      placeholder="Enter approved loan amount"
                      className="input w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Interest Rate % (Optional)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={decisionForm.interestRate}
                      onChange={(e) => setDecisionForm({ ...decisionForm, interestRate: e.target.value })}
                      placeholder="Enter interest rate"
                      className="input w-full"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Review Notes *
                </label>
                <textarea
                  value={decisionForm.notes}
                  onChange={(e) => setDecisionForm({ ...decisionForm, notes: e.target.value })}
                  placeholder="Provide detailed notes about your decision..."
                  rows={6}
                  className="input w-full"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  onClick={() => {
                    setShowDecisionModal(false);
                    setDecisionForm({ decision: 'approved', notes: '', approvedAmount: '', interestRate: '' });
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitDecision}
                  disabled={submitting || !decisionForm.notes.trim()}
                  className={`px-6 py-2 rounded-lg text-white ${
                    decisionForm.decision === 'approved'
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-red-600 hover:bg-red-700'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {submitting ? 'Submitting...' : `Submit ${decisionForm.decision === 'approved' ? 'Approval' : 'Rejection'}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManualReview;
