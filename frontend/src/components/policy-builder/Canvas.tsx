import React, { useCallback, useRef } from 'react';
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
  } = usePolicyBuilderStore();

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
      selectNode(node);
    },
    [selectNode]
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
                return '#10b981';
              case 'condition':
                return '#3b82f6';
              case 'score':
                return '#a855f7';
              case 'apiCall':
                return '#6366f1';
              case 'rule':
                return '#f59e0b';
              case 'decision':
                return '#10b981';
              case 'manualReview':
                return '#f97316';
              case 'dataTransform':
                return '#14b8a6';
              case 'end':
                return '#ef4444';
              default:
                return '#9ca3af';
            }
          }}
          nodeColor={(node) => {
            switch (node.type) {
              case 'start':
                return '#d1fae5';
              case 'condition':
                return '#dbeafe';
              case 'score':
                return '#f3e8ff';
              case 'apiCall':
                return '#e0e7ff';
              case 'rule':
                return '#fef3c7';
              case 'decision':
                return '#d1fae5';
              case 'manualReview':
                return '#ffedd5';
              case 'dataTransform':
                return '#ccfbf1';
              case 'end':
                return '#fee2e2';
              default:
                return '#f3f4f6';
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
