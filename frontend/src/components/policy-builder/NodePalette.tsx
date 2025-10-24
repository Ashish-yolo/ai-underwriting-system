import React from 'react';
import { Cog6ToothIcon } from '@heroicons/react/24/outline';

interface NodePaletteProps {
  onDragStart: (event: React.DragEvent, nodeType: string) => void;
}

export const NodePalette: React.FC<NodePaletteProps> = ({ onDragStart }) => {
  return (
    <div className="w-52 bg-gray-50 border-r border-gray-200 p-4 overflow-y-auto">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">NODES</h2>

      <div className="space-y-4">
        {/* Strategy Node - Only draggable node */}
        <div
          draggable
          onDragStart={(e) => onDragStart(e, 'strategy')}
          className="
            p-4 rounded-lg border-2 border-dashed border-gray-400 bg-white
            cursor-grab active:cursor-grabbing
            hover:border-gray-600 hover:shadow-lg
            transition-all duration-150
            flex flex-col items-center gap-2
          "
        >
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600">
            <Cog6ToothIcon className="w-6 h-6" />
          </div>
          <span className="font-medium text-sm text-gray-900">Strategy Node</span>
          <p className="text-xs text-gray-500 text-center">
            Drag to canvas
          </p>
        </div>

        {/* Help tip */}
        <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-800">
            <strong>How to use:</strong><br/>
            1. Drag Strategy Node to canvas<br/>
            2. Connect nodes from bottom to top<br/>
            3. Click node to configure conditions
          </p>
        </div>
      </div>
    </div>
  );
};
