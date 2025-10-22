import React from 'react';
import {
  PlayIcon,
  QuestionMarkCircleIcon,
  CalculatorIcon,
  CloudIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  UserCircleIcon,
  ArrowsRightLeftIcon,
  StopIcon,
} from '@heroicons/react/24/outline';

interface NodePaletteProps {
  onDragStart: (event: React.DragEvent, nodeType: string) => void;
}

export const NodePalette: React.FC<NodePaletteProps> = ({ onDragStart }) => {
  const nodeDefinitions = [
    {
      type: 'start',
      label: 'Start',
      icon: PlayIcon,
      color: 'green',
      description: 'Entry point for the workflow',
    },
    {
      type: 'condition',
      label: 'Condition',
      icon: QuestionMarkCircleIcon,
      color: 'blue',
      description: 'Branching logic based on field values',
    },
    {
      type: 'score',
      label: 'Score',
      icon: CalculatorIcon,
      color: 'purple',
      description: 'Calculate and accumulate scores',
    },
    {
      type: 'apiCall',
      label: 'API Call',
      icon: CloudIcon,
      color: 'indigo',
      description: 'Fetch data from external APIs',
    },
    {
      type: 'rule',
      label: 'Rule',
      icon: DocumentTextIcon,
      color: 'amber',
      description: 'Apply business rules',
    },
    {
      type: 'decision',
      label: 'Decision',
      icon: CheckCircleIcon,
      color: 'green',
      description: 'Make approval/rejection decisions',
    },
    {
      type: 'manualReview',
      label: 'Manual Review',
      icon: UserCircleIcon,
      color: 'orange',
      description: 'Queue for human review',
    },
    {
      type: 'dataTransform',
      label: 'Transform',
      icon: ArrowsRightLeftIcon,
      color: 'teal',
      description: 'Transform and map data',
    },
    {
      type: 'end',
      label: 'End',
      icon: StopIcon,
      color: 'red',
      description: 'Terminal node',
    },
  ];

  return (
    <div className="w-64 bg-white border-r border-gray-200 p-4 overflow-y-auto">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Node Palette</h2>

      <div className="space-y-2">
        {nodeDefinitions.map((node) => {
          const IconComponent = node.icon;
          return (
            <div
              key={node.type}
              draggable
              onDragStart={(e) => onDragStart(e, node.type)}
              className={`
                p-3 rounded-lg border-2 border-gray-200 bg-white
                cursor-grab active:cursor-grabbing
                hover:border-${node.color}-400 hover:shadow-md
                transition-all duration-150
              `}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className={`flex-shrink-0 w-6 h-6 rounded-full bg-${node.color}-100 flex items-center justify-center text-${node.color}-600`}>
                  <IconComponent className="w-4 h-4" />
                </div>
                <span className="font-medium text-sm text-gray-900">{node.label}</span>
              </div>
              <p className="text-xs text-gray-500 ml-8">{node.description}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-xs text-blue-800">
          <strong>Tip:</strong> Drag nodes onto the canvas to build your workflow. Connect them by dragging from output handles to input handles.
        </p>
      </div>
    </div>
  );
};
