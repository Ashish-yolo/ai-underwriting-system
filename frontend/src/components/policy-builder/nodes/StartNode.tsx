import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { LockClosedIcon } from '@heroicons/react/24/solid';

export const StartNode: React.FC<NodeProps> = ({ selected }) => {
  return (
    <div
      className={`
        relative px-6 py-4 rounded-lg
        bg-gradient-to-r from-green-600 to-green-400
        border-2 ${selected ? 'border-green-800 ring-4 ring-green-200' : 'border-green-600'}
        shadow-lg
        min-w-[150px]
      `}
      style={{
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
      }}
    >
      {/* Lock icon to indicate non-deletable */}
      <LockClosedIcon className="absolute top-2 right-2 h-4 w-4 text-white opacity-70" />

      <div className="flex items-center justify-center gap-2">
        <span className="text-2xl">▶️</span>
        <span className="font-bold text-white text-lg">START</span>
      </div>

      <div className="text-xs text-white text-center mt-1 opacity-80">
        Workflow begins here
      </div>

      {/* Output handle (bottom center) - no input handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="start-output"
        className="w-3 h-3 !bg-green-600 border-2 border-white hover:scale-150 transition-transform"
        style={{
          bottom: -6,
        }}
      />
    </div>
  );
};
