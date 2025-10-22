import React from 'react';
import { NodeProps } from 'reactflow';
import { CustomNode } from './CustomNode';
import { StopIcon } from '@heroicons/react/24/outline';

export const EndNode: React.FC<NodeProps> = (props) => {
  return (
    <CustomNode
      {...props}
      icon={<StopIcon className="w-5 h-5" />}
      color="red"
      hasInput={true}
      hasOutput={false}
    />
  );
};
