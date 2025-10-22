import { StartNode } from './StartNode';
import { ConditionNode } from './ConditionNode';
import { ScoreNode } from './ScoreNode';
import { ApiCallNode } from './ApiCallNode';
import { RuleNode } from './RuleNode';
import { DecisionNode } from './DecisionNode';
import { ManualReviewNode } from './ManualReviewNode';
import { DataTransformNode } from './DataTransformNode';
import { EndNode } from './EndNode';

export { StartNode, ConditionNode, ScoreNode, ApiCallNode, RuleNode, DecisionNode, ManualReviewNode, DataTransformNode, EndNode };

// Node type registry for React Flow
export const nodeTypes = {
  start: StartNode,
  condition: ConditionNode,
  score: ScoreNode,
  apiCall: ApiCallNode,
  rule: RuleNode,
  decision: DecisionNode,
  manualReview: ManualReviewNode,
  dataTransform: DataTransformNode,
  end: EndNode,
};
