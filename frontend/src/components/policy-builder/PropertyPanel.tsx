import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { usePolicyBuilderStore } from '../../stores/policyBuilderStore';

export const PropertyPanel: React.FC = () => {
  const { selectedNode, selectNode, openConfigModal, deleteNode } = usePolicyBuilderStore();

  if (!selectedNode) {
    return null;
  }

  const handleClose = () => {
    selectNode(null);
  };

  const handleDelete = () => {
    if (selectedNode) {
      deleteNode(selectedNode.id);
    }
  };

  const handleConfigure = () => {
    if (selectedNode && selectedNode.type === 'strategy') {
      openConfigModal(selectedNode.id);
    }
  };

  return (
    <div className="w-80 bg-white border-l border-gray-200 p-4 overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Properties</h2>
        <button
          onClick={handleClose}
          className="p-1 text-gray-400 hover:text-gray-600 rounded"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>
      </div>

      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
        <div className="text-xs text-gray-500 mb-1">Node Type</div>
        <div className="font-medium text-gray-900 capitalize">
          {selectedNode.type}
        </div>
        <div className="text-xs text-gray-500 mt-2">Node ID</div>
        <div className="text-xs text-gray-600 font-mono">{selectedNode.id}</div>

        {selectedNode.data?.label && (
          <>
            <div className="text-xs text-gray-500 mt-2">Label</div>
            <div className="text-sm text-gray-900">{selectedNode.data.label}</div>
          </>
        )}

        {selectedNode.type === 'strategy' && selectedNode.data?.conditions && (
          <>
            <div className="text-xs text-gray-500 mt-2">Conditions</div>
            <div className="text-sm text-gray-900">
              {selectedNode.data.conditions.length} condition(s)
            </div>
          </>
        )}
      </div>

      {selectedNode.type === 'strategy' && (
        <button
          onClick={handleConfigure}
          className="w-full mb-3 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Configure Strategy
        </button>
      )}

      {selectedNode.type !== 'start' && selectedNode.id !== 'start-node' && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <button
            onClick={handleDelete}
            className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            Delete Node
          </button>
        </div>
      )}

      {/* Show message for START node */}
      {(selectedNode.type === 'start' || selectedNode.id === 'start-node') && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            <span className="text-xs text-green-800 font-medium">
              START node cannot be deleted
            </span>
          </div>
          <p className="text-xs text-green-700 mt-1">
            This node is required for workflow execution
          </p>
        </div>
      )}
    </div>
  );
};
