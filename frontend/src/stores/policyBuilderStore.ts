import { create } from 'zustand';
import { Node, Edge, Connection, addEdge, applyNodeChanges, applyEdgeChanges, NodeChange, EdgeChange } from 'reactflow';

export interface PolicyBuilderState {
  // Policy metadata
  policyId: string | null;
  policyName: string;
  policyDescription: string;
  policyVersion: number;

  // React Flow state
  nodes: Node[];
  edges: Edge[];

  // UI state
  selectedNode: Node | null;
  selectedEdge: Edge | null;
  isPanelOpen: boolean;
  isValidating: boolean;
  validationErrors: ValidationError[];

  // Actions
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;

  addNode: (type: string, position: { x: number; y: number }) => void;
  deleteNode: (nodeId: string) => void;
  updateNodeData: (nodeId: string, data: any) => void;

  selectNode: (node: Node | null) => void;
  selectEdge: (edge: Edge | null) => void;

  setPolicyMetadata: (metadata: { name?: string; description?: string }) => void;
  loadPolicy: (policyData: any) => void;
  clearPolicy: () => void;

  validateWorkflow: () => Promise<boolean>;
}

export interface ValidationError {
  nodeId?: string;
  edgeId?: string;
  type: 'error' | 'warning';
  message: string;
}

let nodeIdCounter = 1;

export const usePolicyBuilderStore = create<PolicyBuilderState>((set, get) => ({
  // Initial state
  policyId: null,
  policyName: 'Untitled Policy',
  policyDescription: '',
  policyVersion: 1,

  nodes: [],
  edges: [],

  selectedNode: null,
  selectedEdge: null,
  isPanelOpen: false,
  isValidating: false,
  validationErrors: [],

  // Actions
  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  onNodesChange: (changes) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes),
    });
  },

  onEdgesChange: (changes) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
    });
  },

  onConnect: (connection) => {
    set({
      edges: addEdge(connection, get().edges),
    });
  },

  addNode: (type, position) => {
    const newNode: Node = {
      id: `node_${nodeIdCounter++}`,
      type,
      position,
      data: getDefaultNodeData(type),
    };

    set({
      nodes: [...get().nodes, newNode],
    });
  },

  deleteNode: (nodeId) => {
    set({
      nodes: get().nodes.filter(n => n.id !== nodeId),
      edges: get().edges.filter(e => e.source !== nodeId && e.target !== nodeId),
      selectedNode: get().selectedNode?.id === nodeId ? null : get().selectedNode,
    });
  },

  updateNodeData: (nodeId, data) => {
    set({
      nodes: get().nodes.map(node =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, ...data } }
          : node
      ),
    });
  },

  selectNode: (node) => {
    set({
      selectedNode: node,
      selectedEdge: null,
      isPanelOpen: node !== null,
    });
  },

  selectEdge: (edge) => {
    set({
      selectedEdge: edge,
      selectedNode: null,
      isPanelOpen: edge !== null,
    });
  },

  setPolicyMetadata: (metadata) => {
    set({
      policyName: metadata.name ?? get().policyName,
      policyDescription: metadata.description ?? get().policyDescription,
    });
  },

  loadPolicy: (policyData) => {
    set({
      policyId: policyData.id,
      policyName: policyData.name,
      policyDescription: policyData.description,
      policyVersion: policyData.version || 1,
      nodes: policyData.workflow?.nodes || [],
      edges: policyData.workflow?.edges || [],
      selectedNode: null,
      selectedEdge: null,
      isPanelOpen: false,
    });
  },

  clearPolicy: () => {
    set({
      policyId: null,
      policyName: 'Untitled Policy',
      policyDescription: '',
      policyVersion: 1,
      nodes: [],
      edges: [],
      selectedNode: null,
      selectedEdge: null,
      isPanelOpen: false,
      validationErrors: [],
    });
  },

  validateWorkflow: async () => {
    set({ isValidating: true });

    const errors: ValidationError[] = [];
    const { nodes, edges } = get();

    // Check for start node
    const startNodes = nodes.filter(n => n.type === 'start');
    if (startNodes.length === 0) {
      errors.push({
        type: 'error',
        message: 'Workflow must have at least one Start node',
      });
    } else if (startNodes.length > 1) {
      errors.push({
        type: 'error',
        message: 'Workflow can only have one Start node',
      });
    }

    // Check for end nodes
    const endNodes = nodes.filter(n => n.type === 'end');
    if (endNodes.length === 0) {
      errors.push({
        type: 'warning',
        message: 'Workflow should have at least one End node',
      });
    }

    // Check for disconnected nodes
    nodes.forEach(node => {
      if (node.type === 'start') return; // Start nodes don't need incoming edges

      const hasIncoming = edges.some(e => e.target === node.id);
      const hasOutgoing = edges.some(e => e.source === node.id);

      if (!hasIncoming && node.type !== 'start') {
        errors.push({
          nodeId: node.id,
          type: 'warning',
          message: `Node "${node.data.label || node.type}" has no incoming connections`,
        });
      }

      if (!hasOutgoing && node.type !== 'end') {
        errors.push({
          nodeId: node.id,
          type: 'warning',
          message: `Node "${node.data.label || node.type}" has no outgoing connections`,
        });
      }
    });

    // Validate node configurations
    nodes.forEach(node => {
      const nodeErrors = validateNodeConfiguration(node);
      errors.push(...nodeErrors);
    });

    set({
      isValidating: false,
      validationErrors: errors,
    });

    return errors.filter(e => e.type === 'error').length === 0;
  },
}));

// Helper function to get default node data based on type
function getDefaultNodeData(type: string): any {
  const baseData = {
    label: type.charAt(0).toUpperCase() + type.slice(1),
  };

  switch (type) {
    case 'start':
      return { ...baseData, label: 'Start' };

    case 'condition':
      return {
        ...baseData,
        label: 'Condition',
        field: '',
        operator: '==',
        value: '',
      };

    case 'score':
      return {
        ...baseData,
        label: 'Score',
        field: '',
        calculation: 'add',
        points: 0,
      };

    case 'apiCall':
      return {
        ...baseData,
        label: 'API Call',
        method: 'GET',
        url: '',
        headers: {},
        body: {},
      };

    case 'rule':
      return {
        ...baseData,
        label: 'Rule',
        ruleType: 'threshold',
        conditions: [],
      };

    case 'decision':
      return {
        ...baseData,
        label: 'Decision',
        decisionType: 'approve',
        reasonCode: '',
      };

    case 'manualReview':
      return {
        ...baseData,
        label: 'Manual Review',
        priority: 'medium',
        assignTo: 'unassigned',
      };

    case 'dataTransform':
      return {
        ...baseData,
        label: 'Transform',
        transformType: 'map',
        expression: '',
      };

    case 'end':
      return { ...baseData, label: 'End' };

    default:
      return baseData;
  }
}

// Helper function to validate individual node configurations
function validateNodeConfiguration(node: Node): ValidationError[] {
  const errors: ValidationError[] = [];

  switch (node.type) {
    case 'condition':
      if (!node.data.field) {
        errors.push({
          nodeId: node.id,
          type: 'error',
          message: `Condition node "${node.data.label}" must specify a field`,
        });
      }
      if (node.data.value === undefined || node.data.value === '') {
        errors.push({
          nodeId: node.id,
          type: 'error',
          message: `Condition node "${node.data.label}" must specify a value`,
        });
      }
      break;

    case 'score':
      if (!node.data.field) {
        errors.push({
          nodeId: node.id,
          type: 'error',
          message: `Score node "${node.data.label}" must specify a field`,
        });
      }
      if (typeof node.data.points !== 'number') {
        errors.push({
          nodeId: node.id,
          type: 'error',
          message: `Score node "${node.data.label}" must specify points value`,
        });
      }
      break;

    case 'apiCall':
      if (!node.data.url) {
        errors.push({
          nodeId: node.id,
          type: 'error',
          message: `API Call node "${node.data.label}" must specify a URL`,
        });
      }
      break;

    case 'decision':
      if (!node.data.decisionType) {
        errors.push({
          nodeId: node.id,
          type: 'error',
          message: `Decision node "${node.data.label}" must specify a decision type`,
        });
      }
      break;
  }

  return errors;
}
