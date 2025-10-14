import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger';
import { callConnector } from '../services/connector.service';
import * as math from 'mathjs';

export interface WorkflowNode {
  id: string;
  type: string;
  data: any;
  position?: { x: number; y: number };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface Workflow {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export interface ExecutionContext {
  application_id: string;
  underwriting_id: string;
  policy_id: string;
  input_data: Record<string, any>;
  variables: Record<string, any>;
  connector_cache: Record<string, any>;
  execution_trace: ExecutionTraceEntry[];
  start_time: number;
  current_node: string | null;
}

export interface ExecutionTraceEntry {
  node_id: string;
  node_type: string;
  timestamp: string;
  input: Record<string, any>;
  output: any;
  execution_time_ms: number;
  error?: string;
}

export interface ExecutionResult {
  success: boolean;
  application_id: string;
  underwriting_id: string;
  decision: 'approved' | 'rejected' | 'manual_review';
  reason: string;
  details: Record<string, any>;
  execution_trace: ExecutionTraceEntry[];
  total_execution_time_ms: number;
  variables: Record<string, any>;
}

/**
 * Main workflow executor
 */
export const executeWorkflow = async (
  workflow: Workflow,
  inputData: Record<string, any>,
  policyId: string,
  applicationId: string
): Promise<ExecutionResult> => {
  const underwritingId = uuidv4();

  // Initialize execution context
  const context: ExecutionContext = {
    application_id: applicationId,
    underwriting_id: underwritingId,
    policy_id: policyId,
    input_data: inputData,
    variables: { ...inputData }, // Start with input data as variables
    connector_cache: {},
    execution_trace: [],
    start_time: Date.now(),
    current_node: null,
  };

  try {
    // Find start node
    let currentNode = findStartNode(workflow.nodes);

    if (!currentNode) {
      throw new Error('No start node found in workflow');
    }

    // Execute workflow
    while (currentNode) {
      context.current_node = currentNode.id;

      // Execute node
      const nodeResult = await executeNode(currentNode, context, workflow);

      // If this is a decision node, we're done
      if (currentNode.type === 'decision') {
        const totalTime = Date.now() - context.start_time;

        return {
          success: true,
          application_id: applicationId,
          underwriting_id: underwritingId,
          decision: nodeResult.decision,
          reason: nodeResult.reason,
          details: nodeResult.details || {},
          execution_trace: context.execution_trace,
          total_execution_time_ms: totalTime,
          variables: context.variables,
        };
      }

      // Find next node
      currentNode = findNextNode(currentNode, nodeResult, workflow);
    }

    throw new Error('Workflow ended without reaching a decision node');

  } catch (error) {
    logger.error(`Workflow execution error: ${error.message}`);

    const totalTime = Date.now() - context.start_time;

    // Return error as manual review
    return {
      success: false,
      application_id: applicationId,
      underwriting_id: underwritingId,
      decision: 'manual_review',
      reason: `Workflow execution error: ${error.message}`,
      details: { error: error.message },
      execution_trace: context.execution_trace,
      total_execution_time_ms: totalTime,
      variables: context.variables,
    };
  }
};

/**
 * Find start node in workflow
 */
const findStartNode = (nodes: WorkflowNode[]): WorkflowNode | null => {
  return nodes.find(node => node.type === 'start') || null;
};

/**
 * Find next node based on current node and result
 */
const findNextNode = (
  currentNode: WorkflowNode,
  nodeResult: any,
  workflow: Workflow
): WorkflowNode | null => {
  // Find outgoing edges from current node
  const outgoingEdges = workflow.edges.filter(e => e.source === currentNode.id);

  if (outgoingEdges.length === 0) {
    return null;
  }

  // For condition nodes, choose path based on result
  if (currentNode.type === 'condition') {
    const targetEdge = outgoingEdges.find(e =>
      e.sourceHandle === (nodeResult.condition_result ? 'true' : 'false')
    );

    if (targetEdge) {
      return workflow.nodes.find(n => n.id === targetEdge.target) || null;
    }
  }

  // For other nodes, take the first outgoing edge
  const nextEdge = outgoingEdges[0];
  return workflow.nodes.find(n => n.id === nextEdge.target) || null;
};

/**
 * Execute a single node
 */
const executeNode = async (
  node: WorkflowNode,
  context: ExecutionContext,
  workflow: Workflow
): Promise<any> => {
  const startTime = Date.now();

  try {
    let result: any;

    switch (node.type) {
      case 'start':
        result = await executeStartNode(node, context);
        break;
      case 'dataSource':
        result = await executeDataSourceNode(node, context);
        break;
      case 'condition':
        result = await executeConditionNode(node, context);
        break;
      case 'calculation':
        result = await executeCalculationNode(node, context);
        break;
      case 'score':
        result = await executeScoreNode(node, context);
        break;
      case 'decision':
        result = await executeDecisionNode(node, context);
        break;
      case 'apiCall':
        result = await executeAPICallNode(node, context);
        break;
      case 'dbQuery':
        result = await executeDBQueryNode(node, context);
        break;
      case 'end':
        result = { success: true };
        break;
      default:
        throw new Error(`Unknown node type: ${node.type}`);
    }

    const executionTime = Date.now() - startTime;

    // Add to execution trace
    context.execution_trace.push({
      node_id: node.id,
      node_type: node.type,
      timestamp: new Date().toISOString(),
      input: { ...context.variables },
      output: result,
      execution_time_ms: executionTime,
    });

    return result;

  } catch (error) {
    const executionTime = Date.now() - startTime;

    // Log error in trace
    context.execution_trace.push({
      node_id: node.id,
      node_type: node.type,
      timestamp: new Date().toISOString(),
      input: { ...context.variables },
      output: null,
      execution_time_ms: executionTime,
      error: error.message,
    });

    throw error;
  }
};

/**
 * Node handlers
 */

const executeStartNode = async (node: WorkflowNode, context: ExecutionContext) => {
  return { success: true };
};

const executeDataSourceNode = async (node: WorkflowNode, context: ExecutionContext) => {
  const config = node.data.config || {};
  const connectorId = config.connector_id;

  if (!connectorId) {
    throw new Error('No connector configured for data source node');
  }

  // Build parameters from context variables
  const params: Record<string, any> = {};
  if (config.params) {
    Object.keys(config.params).forEach(key => {
      const value = config.params[key];
      params[key] = resolveVariable(value, context.variables);
    });
  }

  // Check cache
  const cacheKey = `${connectorId}_${JSON.stringify(params)}`;
  if (context.connector_cache[cacheKey]) {
    return {
      success: true,
      data: context.connector_cache[cacheKey],
      from_cache: true,
    };
  }

  // Call connector
  try {
    const response = await callConnector(connectorId, params, config.cache_response !== false);

    // Map response to variables
    if (config.field_mapping) {
      Object.keys(config.field_mapping).forEach(variableName => {
        const responsePath = config.field_mapping[variableName];
        context.variables[variableName] = getNestedValue(response, responsePath);
      });
    }

    // Cache response
    context.connector_cache[cacheKey] = response;

    return {
      success: true,
      data: response,
      from_cache: false,
    };
  } catch (error) {
    // Handle based on error configuration
    if (config.on_error === 'skip') {
      return { success: true, skipped: true };
    } else if (config.on_error === 'use_cached') {
      const cached = context.connector_cache[cacheKey];
      if (cached) {
        return { success: true, data: cached, from_cache: true };
      }
    } else if (config.on_error === 'manual_review') {
      throw new Error(`Data source failed: ${error.message}. Sending to manual review.`);
    }
    throw error;
  }
};

const executeConditionNode = async (node: WorkflowNode, context: ExecutionContext) => {
  const config = node.data.config || {};
  const condition = config.condition;

  if (!condition) {
    throw new Error('No condition configured');
  }

  const result = evaluateCondition(condition, context.variables);

  return {
    success: true,
    condition_result: result,
  };
};

const executeCalculationNode = async (node: WorkflowNode, context: ExecutionContext) => {
  const config = node.data.config || {};
  const formula = config.formula;
  const outputVariable = config.output_variable;

  if (!formula || !outputVariable) {
    throw new Error('Formula and output variable are required');
  }

  // Evaluate formula
  const result = evaluateFormula(formula, context.variables);

  // Store in context
  context.variables[outputVariable] = result;

  return {
    success: true,
    calculated_value: result,
  };
};

const executeScoreNode = async (node: WorkflowNode, context: ExecutionContext) => {
  const config = node.data.config || {};
  const factors = config.factors || [];
  const outputVariable = config.output_variable || 'risk_score';

  let totalScore = 0;
  const scoreBreakdown: Record<string, any> = {};

  factors.forEach((factor: any) => {
    const value = context.variables[factor.variable];
    let factorScore = 0;

    // Find matching range
    for (const range of factor.ranges) {
      if (value >= range.min && value <= range.max) {
        factorScore = range.score;
        break;
      }
    }

    // Apply weight
    const weightedScore = factorScore * factor.weight;
    scoreBreakdown[factor.name] = {
      raw_score: factorScore,
      weight: factor.weight,
      weighted_score: weightedScore,
    };

    totalScore += weightedScore;
  });

  // Store in context
  context.variables[outputVariable] = totalScore;

  return {
    success: true,
    total_score: totalScore,
    breakdown: scoreBreakdown,
  };
};

const executeDecisionNode = async (node: WorkflowNode, context: ExecutionContext) => {
  const config = node.data.config || {};
  const decision = config.decision;
  const reason = resolveString(config.reason, context.variables);
  const conditions = config.conditions || [];

  return {
    success: true,
    decision,
    reason,
    details: {
      conditions,
      variables: context.variables,
    },
  };
};

const executeAPICallNode = async (node: WorkflowNode, context: ExecutionContext) => {
  // Similar to data source but for custom API calls
  return { success: true };
};

const executeDBQueryNode = async (node: WorkflowNode, context: ExecutionContext) => {
  // Database query execution
  return { success: true };
};

/**
 * Helper functions
 */

const evaluateCondition = (condition: any, variables: Record<string, any>): boolean => {
  if (condition.operator === 'AND') {
    return condition.conditions.every((c: any) => evaluateCondition(c, variables));
  }

  if (condition.operator === 'OR') {
    return condition.conditions.some((c: any) => evaluateCondition(c, variables));
  }

  const leftValue = resolveVariable(condition.left, variables);
  const rightValue = resolveVariable(condition.right, variables);

  switch (condition.operator) {
    case '>': return leftValue > rightValue;
    case '<': return leftValue < rightValue;
    case '>=': return leftValue >= rightValue;
    case '<=': return leftValue <= rightValue;
    case '==': return leftValue == rightValue;
    case '!=': return leftValue != rightValue;
    case 'IN': return Array.isArray(rightValue) && rightValue.includes(leftValue);
    case 'NOT IN': return Array.isArray(rightValue) && !rightValue.includes(leftValue);
    default: throw new Error(`Unknown operator: ${condition.operator}`);
  }
};

const evaluateFormula = (formula: string, variables: Record<string, any>): number => {
  let expression = formula;

  // Replace variable names with values
  Object.keys(variables).forEach(varName => {
    const regex = new RegExp(`\\b${varName}\\b`, 'g');
    const value = variables[varName];
    expression = expression.replace(regex, String(value));
  });

  try {
    return math.evaluate(expression);
  } catch (error) {
    throw new Error(`Formula evaluation error: ${error.message}`);
  }
};

const resolveVariable = (value: any, variables: Record<string, any>): any => {
  if (typeof value === 'string' && value in variables) {
    return variables[value];
  }
  return value;
};

const resolveString = (template: string, variables: Record<string, any>): string => {
  if (!template) return '';

  let result = template;
  Object.keys(variables).forEach(varName => {
    const regex = new RegExp(`\\{${varName}\\}`, 'g');
    result = result.replace(regex, String(variables[varName]));
  });

  return result;
};

const getNestedValue = (obj: any, path: string): any => {
  return path.split('.').reduce((current, key) => current?.[key], obj);
};
