import React from 'react';
import { NodeProps } from 'reactflow';
import { CustomNode } from './CustomNode';
import { CalculatorIcon } from '@heroicons/react/24/outline';

export const ScoreNode: React.FC<NodeProps> = (props) => {
  const subtitle = props.data.field
    ? `${props.data.calculation} ${props.data.points} points`
    : 'Configure score';

  return (
    <CustomNode
      {...props}
      data={{ ...props.data, subtitle }}
      icon={<CalculatorIcon className="w-5 h-5" />}
      color="purple"
    />
  );
};
