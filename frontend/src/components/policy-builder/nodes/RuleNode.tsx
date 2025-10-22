import React from 'react';
import { NodeProps } from 'reactflow';
import { CustomNode } from './CustomNode';
import { DocumentTextIcon } from '@heroicons/react/24/outline';

export const RuleNode: React.FC<NodeProps> = (props) => {
  const subtitle = props.data.ruleType
    ? `Type: ${props.data.ruleType}`
    : 'Configure rule';

  return (
    <CustomNode
      {...props}
      data={{ ...props.data, subtitle }}
      icon={<DocumentTextIcon className="w-5 h-5" />}
      color="amber"
    />
  );
};
