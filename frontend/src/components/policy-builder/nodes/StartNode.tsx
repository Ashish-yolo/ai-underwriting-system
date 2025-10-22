import React from 'react';
import { NodeProps } from 'reactflow';
import { CustomNode } from './CustomNode';
import { PlayIcon } from '@heroicons/react/24/outline';

export const StartNode: React.FC<NodeProps> = (props) => {
  return (
    <CustomNode
      {...props}
      icon={<PlayIcon className="w-5 h-5" />}
      color="green"
      hasInput={false}
      hasOutput={true}
    />
  );
};
