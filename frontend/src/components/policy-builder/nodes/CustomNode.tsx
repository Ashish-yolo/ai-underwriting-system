import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { usePolicyBuilderStore } from '../../../stores/policyBuilderStore';

interface CustomNodeProps extends NodeProps {
  icon: React.ReactNode;
  color: string;
  hasInput?: boolean;
  hasOutput?: boolean;
}

export const CustomNode: React.FC<CustomNodeProps> = ({
  id,
  data,
  selected,
  icon,
  color,
  hasInput = true,
  hasOutput = true,
  type,
}) => {
  const selectNode = usePolicyBuilderStore(state => state.selectNode);

  const handleClick = () => {
    selectNode({ id, type: type || 'unknown', position: { x: 0, y: 0 }, data });
  };

  return (
    <div
      onClick={handleClick}
      className={`
        relative px-4 py-3 rounded-lg border-2 bg-white shadow-md
        min-w-[180px] cursor-pointer transition-all
        ${selected ? `border-${color}-600 ring-2 ring-${color}-200` : 'border-gray-300 hover:border-gray-400'}
      `}
    >
      {hasInput && (
        <Handle
          type="target"
          position={Position.Top}
          className="w-3 h-3 !bg-gray-400 border-2 border-white"
        />
      )}

      <div className="flex items-center gap-2">
        <div className={`flex-shrink-0 w-8 h-8 rounded-full bg-${color}-100 flex items-center justify-center text-${color}-600`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm text-gray-900 truncate">
            {data.label}
          </div>
          {data.subtitle && (
            <div className="text-xs text-gray-500 truncate">
              {data.subtitle}
            </div>
          )}
        </div>
      </div>

      {hasOutput && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="w-3 h-3 !bg-gray-400 border-2 border-white"
        />
      )}
    </div>
  );
};
