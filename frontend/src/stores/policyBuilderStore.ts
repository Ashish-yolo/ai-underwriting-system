import { create } from 'zustand';
import { Node, Edge, Connection, addEdge, applyNodeChanges, applyEdgeChanges, NodeChange, EdgeChange } from 'reactflow';

export interface Condition {
  id: string;
  variable: string;
  operator: string;
  value: string | number;
  decision: 'Approved' | 'Reject' | 'Manual Check';
  logicalOperator?: 'AND' | 'OR';
}

export interface StrategyNodeData {
  label: string;
  conditions?: Condition[];
  defaultDecision?: 'Approved' | 'Reject' | 'Manual Check';
  testResult?: 'approved' | 'reject' | 'manual_check' | null;
}

export interface PolicyBuilderState {
  // Policy metadata
  policyId: string | null;
  policyName: string;
  policyDescription: string;
  policyVersion: number;

  // React Flow state
  nodes: Node<StrategyNodeData>[];
  edges: Edge[];

  // UI state
  selectedNode: Node<StrategyNodeData> | null;
  isConfigModalOpen: boolean;
  isTestModalOpen: boolean;
  testResults: TestResults | null;
  isValidating: boolean;
  validationErrors: ValidationError[];

  // Actions
  setNodes: (nodes: Node<StrategyNodeData>[]) => void;
  setEdges: (edges: Edge[]) => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;

  addNode: (type: string, position: { x: number; y: number }) => void;
  deleteNode: (nodeId: string) => void;
  updateNodeData: (nodeId: string, data: Partial<StrategyNodeData>) => void;

  selectNode: (node: Node<StrategyNodeData> | null) => void;
  openConfigModal: (nodeId: string) => void;
  closeConfigModal: () => void;
  openTestModal: () => void;
  closeTestModal: () => void;
  clearTestResults: () => void;
  setTestResultOnNode: (nodeId: string, result: 'approved' | 'reject' | 'manual_check' | null) => void;

  setPolicyMetadata: (metadata: { name?: string; description?: string }) => void;
  loadPolicy: (policyData: any) => void;
  clearPolicy: () => void;
  initializeCanvas: () => void;

  validateWorkflow: () => Promise<boolean>;
  testPolicy: (testData: any) => Promise<void>;
}

export interface ValidationError {
  nodeId?: string;
  edgeId?: string;
  type: 'error' | 'warning';
  message: string;
}

export interface TestResults {
  finalDecision: 'Approved' | 'Reject' | 'Manual Check';
  executionTrace: {
    nodeId: string;
    nodeName: string;
    conditionsEvaluated: {
      condition: string;
      result: boolean;
      decision: string;
    }[];
    nodeDecision: string;
  }[];
  allDecisions: string[];
  votingResult: {
    approved: number;
    reject: number;
    manualCheck: number;
  };
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
  isConfigModalOpen: false,
  isTestModalOpen: false,
  testResults: null,
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
    // Prevent deletion of START node
    if (nodeId === 'start-node') {
      console.warn('Cannot delete START node - it is required for workflow execution');
      return;
    }

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
    });
  },

  openConfigModal: (nodeId) => {
    const node = get().nodes.find(n => n.id === nodeId);
    if (node) {
      set({
        selectedNode: node,
        isConfigModalOpen: true,
      });
    }
  },

  closeConfigModal: () => {
    set({
      isConfigModalOpen: false,
      selectedNode: null,
    });
  },

  openTestModal: () => {
    set({ isTestModalOpen: true });
  },

  closeTestModal: () => {
    set({ isTestModalOpen: false });
  },

  clearTestResults: () => {
    // Clear test results from all nodes
    set({
      testResults: null,
      nodes: get().nodes.map(node => ({
        ...node,
        data: { ...node.data, testResult: null },
      })),
    });
  },

  setTestResultOnNode: (nodeId, result) => {
    set({
      nodes: get().nodes.map(node =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, testResult: result } }
          : node
      ),
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
      isConfigModalOpen: false,
      isTestModalOpen: false,
      testResults: null,
    });
  },

  clearPolicy: () => {
    // Create START node when clearing
    const startNode: Node<StrategyNodeData> = {
      id: 'start-node',
      type: 'start',
      position: { x: 250, y: 50 },
      data: { label: 'Start' },
      draggable: false,
      deletable: false,
    };

    set({
      policyId: null,
      policyName: 'Untitled Policy',
      policyDescription: '',
      policyVersion: 1,
      nodes: [startNode],
      edges: [],
      selectedNode: null,
      isConfigModalOpen: false,
      isTestModalOpen: false,
      testResults: null,
      validationErrors: [],
    });
  },

  initializeCanvas: () => {
    // Only initialize if canvas is empty
    if (get().nodes.length === 0) {
      const startNode: Node<StrategyNodeData> = {
        id: 'start-node',
        type: 'start',
        position: { x: 250, y: 50 },
        data: { label: 'Start' },
        draggable: false,
        deletable: false,
      };

      set({ nodes: [startNode] });
    }
  },

  validateWorkflow: async () => {
    set({ isValidating: true });

    const errors: ValidationError[] = [];
    const { nodes, edges } = get();

    // Check for START node
    const startNodes = nodes.filter(n => n.type === 'start' || n.id === 'start-node');
    if (startNodes.length === 0) {
      errors.push({
        type: 'error',
        message: 'Workflow must have a START node',
      });
    } else if (startNodes.length > 1) {
      errors.push({
        type: 'error',
        message: 'Workflow can only have one START node',
      });
    }

    // No END node requirement - last executed node determines final decision

    // Check for disconnected nodes
    nodes.forEach(node => {
      // Skip START node for incoming edge check
      if (node.type === 'start' || node.id === 'start-node') {
        // START node should have at least one outgoing edge
        const hasOutgoing = edges.some(e => e.source === node.id);
        if (!hasOutgoing) {
          errors.push({
            nodeId: node.id,
            type: 'warning',
            message: 'START node should connect to at least one strategy node',
          });
        }
        return;
      }

      const hasIncoming = edges.some(e => e.target === node.id);

      if (!hasIncoming) {
        errors.push({
          nodeId: node.id,
          type: 'warning',
          message: `Node "${node.data.label || node.type}" has no incoming connections`,
        });
      }

      // Strategy nodes can be terminal nodes (last in execution path)
      // so no warning for missing outgoing connections
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

  testPolicy: async (testData: any) => {
    const { nodes } = get();
    const executionTrace: TestResults['executionTrace'] = [];
    const allDecisions: string[] = [];

    // Find all strategy nodes
    const strategyNodes = nodes.filter(n => n.type === 'strategy');

    // Evaluate each strategy node
    for (const node of strategyNodes) {
      const nodeData = node.data as StrategyNodeData;
      const conditions = nodeData.conditions || [];

      const conditionsEvaluated = conditions.map(cond => {
        const result = evaluateCondition(cond, testData);
        return {
          condition: `${cond.variable} ${cond.operator} ${cond.value}`,
          result,
          decision: cond.decision,
        };
      });

      // Determine node decision based on conditions
      let nodeDecision = nodeData.defaultDecision || 'Manual Check';

      // Find first matching condition
      for (let i = 0; i < conditions.length; i++) {
        const cond = conditions[i];
        const isMatch = evaluateCondition(cond, testData);

        if (isMatch) {
          nodeDecision = cond.decision;

          // Check if we need to continue with AND/OR logic
          if (i < conditions.length - 1 && cond.logicalOperator === 'OR') {
            break; // OR means we stop at first match
          } else if (i < conditions.length - 1 && cond.logicalOperator === 'AND') {
            // Continue checking next condition
            continue;
          } else {
            break;
          }
        } else {
          // If condition doesn't match and it's AND, use default
          if (i < conditions.length - 1 && cond.logicalOperator === 'AND') {
            nodeDecision = nodeData.defaultDecision || 'Manual Check';
            break;
          }
        }
      }

      executionTrace.push({
        nodeId: node.id,
        nodeName: nodeData.label || 'Strategy',
        conditionsEvaluated,
        nodeDecision,
      });

      allDecisions.push(nodeDecision);

      // Set visual feedback on node
      const visualResult = nodeDecision === 'Approved' ? 'approved'
        : nodeDecision === 'Reject' ? 'reject'
        : 'manual_check';

      // Update node immediately with test result
      set({
        nodes: get().nodes.map(n =>
          n.id === node.id
            ? { ...n, data: { ...n.data, testResult: visualResult } }
            : n
        ),
      });

      // Add delay for visual effect
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Voting algorithm: Reject > Manual Check > Approved
    const votingResult = {
      approved: allDecisions.filter(d => d === 'Approved').length,
      reject: allDecisions.filter(d => d === 'Reject').length,
      manualCheck: allDecisions.filter(d => d === 'Manual Check').length,
    };

    let finalDecision: 'Approved' | 'Reject' | 'Manual Check' = 'Approved';
    if (votingResult.reject > 0) {
      finalDecision = 'Reject';
    } else if (votingResult.manualCheck > 0) {
      finalDecision = 'Manual Check';
    }

    const results: TestResults = {
      finalDecision,
      executionTrace,
      allDecisions,
      votingResult,
    };

    set({ testResults: results });
  },
}));

// Helper function to evaluate a single condition
function evaluateCondition(condition: Condition, testData: any): boolean {
  const { variable, operator, value } = condition;

  // Get actual value from test data using dot notation
  const actualValue = getNestedValue(testData, variable);

  switch (operator) {
    case '=':
      return actualValue == value;
    case '!=':
      return actualValue != value;
    case '<':
      return Number(actualValue) < Number(value);
    case '>':
      return Number(actualValue) > Number(value);
    case '<=':
      return Number(actualValue) <= Number(value);
    case '>=':
      return Number(actualValue) >= Number(value);
    case 'IN':
      const listValues = String(value).split(',').map(v => v.trim());
      return listValues.includes(String(actualValue));
    case 'NOT IN':
      const notInValues = String(value).split(',').map(v => v.trim());
      return !notInValues.includes(String(actualValue));
    case 'CONTAINS':
      return String(actualValue).includes(String(value));
    case 'STARTS_WITH':
      return String(actualValue).startsWith(String(value));
    case 'IS_NULL':
      return actualValue === null || actualValue === undefined || actualValue === '';
    case 'IS_NOT_NULL':
      return actualValue !== null && actualValue !== undefined && actualValue !== '';
    default:
      return false;
  }
}

// Helper function to get nested value from object using dot notation
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

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

    case 'strategy':
      return {
        ...baseData,
        label: 'Strategy',
        conditions: [],
        defaultDecision: 'Manual Check' as const,
      };

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
