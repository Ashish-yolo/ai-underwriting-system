import React from 'react';
import { NodeProps } from 'reactflow';
import { CustomNode } from './CustomNode';
import { CheckCircleIcon } from '@heroicons/react/24/outline';

export const DecisionNode: React.FC<NodeProps> = (props) => {
  const subtitle = props.data.decisionType
    ? `Decision: ${props.data.decisionType}`
    : 'Configure decision';

  return (
    <CustomNode
      {...props}
      data={{ ...props.data, subtitle }}
      icon={<CheckCircleIcon className="w-5 h-5" />}
      color="green"
    />
  );
};
