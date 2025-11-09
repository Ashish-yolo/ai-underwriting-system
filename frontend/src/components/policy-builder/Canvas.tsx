import React, { useCallback, useRef, useEffect } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  ReactFlowProvider,
  ReactFlowInstance,
  ConnectionLineType,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import '../../styles/nodeTransitions.css';

import { usePolicyBuilderStore } from '../../stores/policyBuilderStore';
import { nodeTypes } from './nodes';
import { useProximitySnapping, DEFAULT_PROXIMITY_CONFIG } from '../../hooks/useProximitySnapping';

// Custom styles for connections
const connectionLineStyle = {
  strokeWidth: 3,
  stroke: '#3B82F6',
};

const defaultEdgeOptions = {
  style: { strokeWidth: 3, stroke: '#6B7280' },
  type: 'smoothstep',
  markerEnd: {
    type: MarkerType.ArrowClosed,
    color: '#6B7280',
  },
  animated: true,
};

export const Canvas: React.FC = () => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = React.useState<ReactFlowInstance | null>(null);
  const [isInitialized, setIsInitialized] = React.useState(false);

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
    updateNodePosition,
  } = usePolicyBuilderStore();

  // Initialize proximity snapping with smooth transitions
  const proximityConfig = {
    ...DEFAULT_PROXIMITY_CONFIG,
    proximityThreshold: 200, // Trigger when nodes are within 200px
    transitionDuration: 400, // 400ms smooth transition
    minimumGap: 60,
  };

  const { onNodeDragStart, onNodeDrag, onNodeDragStop } = useProximitySnapping(
    nodes,
    updateNodePosition,
    proximityConfig
  );

  // Initialize canvas with Start node on mount
  useEffect(() => {
    initializeCanvas();
  }, [initializeCanvas]);

  // Set initial viewport ONCE when reactFlow instance is ready
  useEffect(() => {
    if (reactFlowInstance && !isInitialized) {
      reactFlowInstance.setViewport({ x: 50, y: 50, zoom: 0.6 });
      setIsInitialized(true);
    }
  }, [reactFlowInstance, isInitialized]);

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

      if (!reactFlowInstance) {
        return;
      }

      // Use screenToFlowPosition instead of deprecated project method
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
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

  // Validate connections
  const isValidConnection = useCallback((connection: any) => {
    // Prevent self-connections
    if (connection.source === connection.target) {
      return false;
    }

    // Prevent duplicate connections
    const existingConnection = edges.find(
      (edge) =>
        edge.source === connection.source &&
        edge.target === connection.target &&
        edge.sourceHandle === connection.sourceHandle &&
        edge.targetHandle === connection.targetHandle
    );

    if (existingConnection) {
      return false;
    }

    return true;
  }, [edges]);

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
        onNodeDragStart={onNodeDragStart}
        onNodeDrag={onNodeDrag}
        onNodeDragStop={onNodeDragStop}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        connectionLineType={ConnectionLineType.SmoothStep}
        connectionLineStyle={connectionLineStyle}
        isValidConnection={isValidConnection}
        snapToGrid={true}
        snapGrid={[15, 15]}
        defaultViewport={{ x: 0, y: 0, zoom: 0.6 }}
        minZoom={0.2}
        maxZoom={2}
        attributionPosition="bottom-left"
        connectionRadius={50}
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
