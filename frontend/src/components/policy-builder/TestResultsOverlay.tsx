import React from 'react';
import { CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { TestResults } from '../../stores/policyBuilderStore';

interface TestResultsOverlayProps {
  results: TestResults | null;
}

export const TestResultsOverlay: React.FC<TestResultsOverlayProps> = ({ results }) => {
  if (!results) return null;

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-4xl pointer-events-none">
      <div className={`rounded-lg shadow-2xl p-4 pointer-events-auto ${
        results.finalDecision === 'Approved'
          ? 'bg-green-50 border-2 border-green-500'
          : results.finalDecision === 'Rejected'
          ? 'bg-red-50 border-2 border-red-500'
          : 'bg-yellow-50 border-2 border-yellow-500'
      }`}>
        {/* Final Decision Header */}
        <div className="flex items-center gap-3 mb-3">
          {results.finalDecision === 'Approved' && (
            <CheckCircleIcon className="w-7 h-7 text-green-600" />
          )}
          {results.finalDecision === 'Rejected' && (
            <XCircleIcon className="w-7 h-7 text-red-600" />
          )}
          {results.finalDecision === 'Manual Review' && (
            <ExclamationTriangleIcon className="w-7 h-7 text-yellow-600" />
          )}
          <h3 className={`text-xl font-bold ${
            results.finalDecision === 'Approved'
              ? 'text-green-900'
              : results.finalDecision === 'Rejected'
              ? 'text-red-900'
              : 'text-yellow-900'
          }`}>
            Final Decision: {results.finalDecision}
          </h3>
        </div>

        {/* Summary Stats Grid */}
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-white rounded-lg p-2 text-center shadow-sm">
            <div className="text-xl font-bold text-gray-900">
              {results.summary.totalConditions}
            </div>
            <div className="text-xs text-gray-600 font-medium">Total Conditions</div>
          </div>
          <div className="bg-green-100 rounded-lg p-2 text-center shadow-sm">
            <div className="text-xl font-bold text-green-900">
              {results.summary.passedConditions}
            </div>
            <div className="text-xs text-green-700 font-medium">Passed</div>
          </div>
          <div className="bg-red-100 rounded-lg p-2 text-center shadow-sm">
            <div className="text-xl font-bold text-red-900">
              {results.summary.failedConditions}
            </div>
            <div className="text-xs text-red-700 font-medium">Failed</div>
          </div>
          <div className="bg-yellow-100 rounded-lg p-2 text-center shadow-sm">
            <div className="text-xl font-bold text-yellow-900">
              {results.summary.manualCheckConditions}
            </div>
            <div className="text-xs text-yellow-700 font-medium">Manual Check</div>
          </div>
        </div>
      </div>
    </div>
  );
};
