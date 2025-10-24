import React, { useCallback, useRef, useEffect } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  ReactFlowProvider,
  ReactFlowInstance,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { usePolicyBuilderStore } from '../../stores/policyBuilderStore';
import { nodeTypes } from './nodes';

export const Canvas: React.FC = () => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = React.useState<ReactFlowInstance | null>(null);

  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    selectNode,
    addNode,
    initializeCanvas,
    openConfigModal,
  } = usePolicyBuilderStore();

  // Initialize canvas with Start node on mount
  useEffect(() => {
    initializeCanvas();
  }, [initializeCanvas]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');

      // Check if the dropped element is valid
      if (typeof type === 'undefined' || !type) {
        return;
      }

      // Get the position where the node was dropped
      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
      if (!reactFlowBounds || !reactFlowInstance) {
        return;
      }

      const position = reactFlowInstance.project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      addNode(type, position);
    },
    [reactFlowInstance, addNode]
  );

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: any) => {
      // For Strategy nodes, open config modal directly
      if (node.type === 'strategy') {
        openConfigModal(node.id);
      } else {
        // For other nodes (like START), show in PropertyPanel
        selectNode(node);
      }
    },
    [openConfigModal, selectNode]
  );

  const onPaneClick = useCallback(() => {
    selectNode(null);
  }, [selectNode]);

  return (
    <div ref={reactFlowWrapper} className="flex-1 h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onInit={setReactFlowInstance}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-left"
      >
        <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
        <Controls />
        <MiniMap
          nodeStrokeColor={(node) => {
            switch (node.type) {
              case 'start':
                return '#16a34a'; // Green for START
              case 'strategy':
                return '#6b7280';
              default:
                return '#9ca3af';
            }
          }}
          nodeColor={(node) => {
            switch (node.type) {
              case 'start':
                return '#dcfce7'; // Light green for START
              case 'strategy':
                return '#f3f4f6';
              default:
                return '#f9fafb';
            }
          }}
          nodeBorderRadius={8}
        />
      </ReactFlow>
    </div>
  );
};

export const CanvasWithProvider: React.FC = () => {
  return (
    <ReactFlowProvider>
      <Canvas />
    </ReactFlowProvider>
  );
};
