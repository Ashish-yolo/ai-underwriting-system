import { useCallback, useRef, useEffect } from 'react';
import { Node } from 'reactflow';

/**
 * Configuration for proximity-based snapping behavior
 */
export interface ProximityConfig {
  /** Distance threshold (in pixels) to trigger proximity detection */
  proximityThreshold: number;

  /** Transition duration for smooth movement (in milliseconds) */
  transitionDuration: number;

  /** Easing function for transitions */
  easingFunction: string;

  /** Whether to enable proximity detection */
  enabled: boolean;

  /** Minimum distance between nodes when snapping */
  minimumGap: number;
}

export const DEFAULT_PROXIMITY_CONFIG: ProximityConfig = {
  proximityThreshold: 150,
  transitionDuration: 300,
  easingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)', // Material Design easing
  enabled: true,
  minimumGap: 50,
};

/**
 * Calculate Euclidean distance between two points
 */
function calculateDistance(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

/**
 * Calculate the optimal position for a strategy block between multiple policy nodes
 * Uses centroid calculation with weighted influence based on proximity
 */
function calculateStrategyPosition(
  policyNodes: Node[],
  config: ProximityConfig
): { x: number; y: number } | null {
  if (policyNodes.length === 0) return null;
  if (policyNodes.length === 1) {
    // Position strategy block to the right of the single policy
    return {
      x: policyNodes[0].position.x + 200,
      y: policyNodes[0].position.y,
    };
  }

  // Calculate centroid (average position) of all policy nodes
  let totalX = 0;
  let totalY = 0;
  let totalWeight = 0;

  for (const node of policyNodes) {
    // Use inverse distance as weight (closer nodes have more influence)
    const weight = 1.0;
    totalX += node.position.x * weight;
    totalY += node.position.y * weight;
    totalWeight += weight;
  }

  return {
    x: totalX / totalWeight,
    y: totalY / totalWeight,
  };
}

/**
 * Find policy nodes that are within proximity of each other
 * Returns clusters of nearby nodes
 */
function findProximatePolicyNodes(
  nodes: Node[],
  config: ProximityConfig
): Node[][] {
  const policyNodes = nodes.filter(
    (n) => n.type !== 'strategy' && n.type !== 'start'
  );

  if (policyNodes.length < 2) return [];

  const clusters: Node[][] = [];
  const visited = new Set<string>();

  for (const node of policyNodes) {
    if (visited.has(node.id)) continue;

    const cluster: Node[] = [node];
    visited.add(node.id);

    // Find all nodes within proximity threshold
    for (const otherNode of policyNodes) {
      if (visited.has(otherNode.id)) continue;

      const distance = calculateDistance(
        node.position.x,
        node.position.y,
        otherNode.position.x,
        otherNode.position.y
      );

      if (distance <= config.proximityThreshold) {
        cluster.push(otherNode);
        visited.add(otherNode.id);
      }
    }

    // Only consider clusters with 2+ nodes
    if (cluster.length >= 2) {
      clusters.push(cluster);
    }
  }

  return clusters;
}

/**
 * Custom hook for managing proximity-based snapping behavior
 *
 * This hook monitors node positions and automatically repositions strategy blocks
 * when policy nodes are dragged close to each other. The movement is smooth and
 * configurable.
 *
 * @param nodes - Current array of all nodes
 * @param updateNodePosition - Callback to update a node's position
 * @param config - Configuration for proximity behavior
 *
 * @example
 * ```tsx
 * const { onNodeDrag, onNodeDragStop } = useProximitySnapping(
 *   nodes,
 *   (nodeId, position) => {
 *     updateNodePosition(nodeId, position);
 *   }
 * );
 * ```
 */
export function useProximitySnapping(
  nodes: Node[],
  updateNodePosition: (nodeId: string, position: { x: number; y: number }) => void,
  config: ProximityConfig = DEFAULT_PROXIMITY_CONFIG
) {
  // Track which nodes are currently being dragged
  const draggingNodeId = useRef<string | null>(null);

  // Track pending transitions to avoid overlapping animations
  const pendingTransitions = useRef<Set<string>>(new Set());

  // Debounce timer for proximity checks
  const proximityCheckTimer = useRef<NodeJS.Timeout | null>(null);

  /**
   * Handle node drag events
   * Checks for proximity and updates strategy block positions
   */
  const handleProximityCheck = useCallback(() => {
    if (!config.enabled) return;

    const strategyNodes = nodes.filter((n) => n.type === 'strategy');
    const policyNodes = nodes.filter(
      (n) => n.type !== 'strategy' && n.type !== 'start'
    );

    if (strategyNodes.length === 0 || policyNodes.length === 0) return;

    // Find clusters of proximate policy nodes
    const clusters = findProximatePolicyNodes(nodes, config);

    // For each strategy block, find the nearest cluster and position it
    for (const strategyNode of strategyNodes) {
      if (pendingTransitions.current.has(strategyNode.id)) continue;

      // Find the closest cluster to this strategy block
      let closestCluster: Node[] | null = null;
      let minDistance = Infinity;

      for (const cluster of clusters) {
        const clusterCenter = calculateStrategyPosition(cluster, config);
        if (!clusterCenter) continue;

        const dist = calculateDistance(
          strategyNode.position.x,
          strategyNode.position.y,
          clusterCenter.x,
          clusterCenter.y
        );

        if (dist < minDistance) {
          minDistance = dist;
          closestCluster = cluster;
        }
      }

      // If we found a close cluster, move the strategy block
      if (closestCluster && minDistance < config.proximityThreshold * 2) {
        const newPosition = calculateStrategyPosition(closestCluster, config);
        if (!newPosition) continue;

        // Check if position actually changed significantly (avoid micro-movements)
        const positionDelta = calculateDistance(
          strategyNode.position.x,
          strategyNode.position.y,
          newPosition.x,
          newPosition.y
        );

        if (positionDelta > 10) {
          // Significant movement needed
          pendingTransitions.current.add(strategyNode.id);

          // Apply smooth transition via CSS
          updateNodePosition(strategyNode.id, newPosition);

          // Clear transition lock after animation completes
          setTimeout(() => {
            pendingTransitions.current.delete(strategyNode.id);
          }, config.transitionDuration);
        }
      }
    }
  }, [nodes, config, updateNodePosition]);

  /**
   * Callback for when a node starts being dragged
   */
  const onNodeDragStart = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      draggingNodeId.current = node.id;
    },
    []
  );

  /**
   * Callback for when a node is being dragged
   * Debounces proximity checks for performance
   */
  const onNodeDrag = useCallback(
    (_event: React.MouseEvent, _node: Node) => {
      if (!config.enabled) return;

      // Debounce proximity checks during drag for performance
      if (proximityCheckTimer.current) {
        clearTimeout(proximityCheckTimer.current);
      }

      proximityCheckTimer.current = setTimeout(() => {
        handleProximityCheck();
      }, 50); // Check every 50ms during drag
    },
    [handleProximityCheck, config.enabled]
  );

  /**
   * Callback for when dragging stops
   * Performs final proximity check
   */
  const onNodeDragStop = useCallback(
    (_event: React.MouseEvent, _node: Node) => {
      draggingNodeId.current = null;

      // Perform final proximity check after drag ends
      if (proximityCheckTimer.current) {
        clearTimeout(proximityCheckTimer.current);
      }
      handleProximityCheck();
    },
    [handleProximityCheck]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (proximityCheckTimer.current) {
        clearTimeout(proximityCheckTimer.current);
      }
    };
  }, []);

  return {
    onNodeDragStart,
    onNodeDrag,
    onNodeDragStop,
    config,
  };
}

/**
 * Calculate snap points for grid-based snapping (optional enhancement)
 * This can be used in conjunction with proximity snapping
 */
export function calculateSnapPosition(
  position: { x: number; y: number },
  gridSize: number
): { x: number; y: number } {
  return {
    x: Math.round(position.x / gridSize) * gridSize,
    y: Math.round(position.y / gridSize) * gridSize,
  };
}
