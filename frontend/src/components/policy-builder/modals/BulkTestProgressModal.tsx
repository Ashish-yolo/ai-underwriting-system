import React from 'react';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid';

interface BulkTestProgressModalProps {
  isOpen: boolean;
  progress: number; // 0-100
  total: number;
  processed: number;
  successCount: number;
  failureCount: number;
  currentApplication?: string;
}

export const BulkTestProgressModal: React.FC<BulkTestProgressModalProps> = ({
  isOpen,
  progress,
  total,
  processed,
  successCount,
  failureCount,
  currentApplication,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Processing Bulk Test</h2>
          <p className="text-sm text-gray-600 mt-1">
            Please wait while we process your applications...
          </p>
        </div>

        {/* Content */}
        <div className="px-6 py-8 space-y-6">
          {/* Progress Bar */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                Progress: {processed} / {total} applications
              </span>
              <span className="text-sm font-semibold text-blue-600">
                {Math.round(progress)}%
              </span>
            </div>
            <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300 ease-out rounded-full"
                style={{ width: `${progress}%` }}
              >
                <div className="w-full h-full bg-gradient-to-r from-white/0 via-white/20 to-white/0 animate-shimmer" />
              </div>
            </div>
          </div>

          {/* Current Application */}
          {currentApplication && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-medium text-blue-900">Currently Processing:</p>
              <p className="text-sm text-blue-700 mt-1 font-mono">{currentApplication}</p>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">{processed}</div>
              <div className="text-sm text-gray-600 mt-1">Processed</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <div className="flex items-center justify-center gap-1">
                <CheckCircleIcon className="w-6 h-6 text-green-600" />
                <div className="text-2xl font-bold text-green-900">{successCount}</div>
              </div>
              <div className="text-sm text-green-700 mt-1">Successful</div>
            </div>
            <div className="bg-red-50 rounded-lg p-4 text-center">
              <div className="flex items-center justify-center gap-1">
                <XCircleIcon className="w-6 h-6 text-red-600" />
                <div className="text-2xl font-bold text-red-900">{failureCount}</div>
              </div>
              <div className="text-sm text-red-700 mt-1">Failed</div>
            </div>
          </div>

          {/* Info */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              <span className="font-semibold">Note:</span> The results Excel file will automatically download
              when processing is complete. Do not close this window.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
