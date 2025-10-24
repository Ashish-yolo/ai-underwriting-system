import { StartNode } from './StartNode';
import { StrategyNode } from './StrategyNode';

export { StartNode, StrategyNode };

// Node type registry for React Flow
export const nodeTypes = {
  start: StartNode,
  strategy: StrategyNode,
};
