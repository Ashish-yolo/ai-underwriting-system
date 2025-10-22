import React from 'react';
import { NodeProps } from 'reactflow';
import { CustomNode } from './CustomNode';
import { QuestionMarkCircleIcon } from '@heroicons/react/24/outline';

export const ConditionNode: React.FC<NodeProps> = (props) => {
  const subtitle = props.data.field
    ? `${props.data.field} ${props.data.operator} ${props.data.value}`
    : 'Configure condition';

  return (
    <CustomNode
      {...props}
      data={{ ...props.data, subtitle }}
      icon={<QuestionMarkCircleIcon className="w-5 h-5" />}
      color="blue"
    />
  );
};
