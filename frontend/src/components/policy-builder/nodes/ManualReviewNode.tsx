import React from 'react';
import { NodeProps } from 'reactflow';
import { CustomNode } from './CustomNode';
import { UserCircleIcon } from '@heroicons/react/24/outline';

export const ManualReviewNode: React.FC<NodeProps> = (props) => {
  const subtitle = props.data.priority
    ? `Priority: ${props.data.priority}`
    : 'Configure review';

  return (
    <CustomNode
      {...props}
      data={{ ...props.data, subtitle }}
      icon={<UserCircleIcon className="w-5 h-5" />}
      color="orange"
    />
  );
};
