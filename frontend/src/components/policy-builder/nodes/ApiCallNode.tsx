import React from 'react';
import { NodeProps } from 'reactflow';
import { CustomNode } from './CustomNode';
import { CloudIcon } from '@heroicons/react/24/outline';

export const ApiCallNode: React.FC<NodeProps> = (props) => {
  const subtitle = props.data.url
    ? `${props.data.method} ${props.data.url.substring(0, 30)}...`
    : 'Configure API call';

  return (
    <CustomNode
      {...props}
      data={{ ...props.data, subtitle }}
      icon={<CloudIcon className="w-5 h-5" />}
      color="indigo"
    />
  );
};
