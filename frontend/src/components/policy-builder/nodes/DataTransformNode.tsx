import React from 'react';
import { NodeProps } from 'reactflow';
import { CustomNode } from './CustomNode';
import { ArrowsRightLeftIcon } from '@heroicons/react/24/outline';

export const DataTransformNode: React.FC<NodeProps> = (props) => {
  const subtitle = props.data.transformType
    ? `Transform: ${props.data.transformType}`
    : 'Configure transform';

  return (
    <CustomNode
      {...props}
      data={{ ...props.data, subtitle }}
      icon={<ArrowsRightLeftIcon className="w-5 h-5" />}
      color="teal"
    />
  );
};
