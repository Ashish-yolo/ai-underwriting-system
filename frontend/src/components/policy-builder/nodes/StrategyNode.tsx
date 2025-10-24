import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

interface StrategyNodeData {
  label: string;
  conditions?: any[];
  testResult?: 'approved' | 'reject' | 'manual_check' | null;
}

export const StrategyNode: React.FC<NodeProps<StrategyNodeData>> = ({
  data,
  selected,
}) => {
  const hasConditions = data.conditions && data.conditions.length > 0;
  const testResult = data.testResult;

  // Determine node styling based on state
  const getNodeStyle = () => {
    // Testing states (during test execution)
    if (testResult === 'approved') {
      return {
        border: '3px solid #10B981',
        background: '#ECFDF5',
        boxShadow: '0 0 10px rgba(16, 185, 129, 0.3)',
      };
    } else if (testResult === 'manual_check') {
      return {
        border: '3px solid #F59E0B',
        background: '#FFFBEB',
        boxShadow: '0 0 10px rgba(245, 158, 11, 0.3)',
      };
    } else if (testResult === 'reject') {
      return {
        border: '3px solid #EF4444',
        background: '#FEF2F2',
        boxShadow: '0 0 10px rgba(239, 68, 68, 0.3)',
      };
    }

    // Default state (no test running)
    return {
      border: selected ? '2px solid #3B82F6' : '2px solid #6B7280',
      background: 'white',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    };
  };

  return (
    <div
      className="relative px-4 py-3 rounded-lg transition-all"
      style={{
        ...getNodeStyle(),
        minWidth: '180px',
        minHeight: '80px',
      }}
    >
      {/* Input handle (top center) */}
      <Handle
        type="target"
        position={Position.Top}
        id="strategy-input"
        className="w-3 h-3 !bg-green-500 border-2 border-white hover:scale-150 transition-transform"
        style={{
          top: -6,
        }}
      />

      {/* Node content */}
      <div className="flex flex-col gap-2">
        {/* Line 1: Node name */}
        <div className="font-bold text-sm text-gray-900">{data.label}</div>

        {/* Line 2: Status */}
        <div className="text-xs text-gray-600">
          {hasConditions ? (
            <span className="flex items-center gap-1">
              <span>✓</span>
              <span>Configured ({data.conditions?.length} condition{data.conditions?.length !== 1 ? 's' : ''})</span>
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <span>⚙</span>
              <span>Configure</span>
            </span>
          )}
        </div>

        {/* Condition count badge */}
        {hasConditions && (
          <div className="absolute -top-2 -right-2 bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
            {data.conditions?.length}
          </div>
        )}
      </div>

      {/* Output handle (bottom center) */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="strategy-output"
        className="w-3 h-3 !bg-blue-600 border-2 border-white hover:scale-150 transition-transform"
        style={{
          bottom: -6,
        }}
      />
    </div>
  );
};
