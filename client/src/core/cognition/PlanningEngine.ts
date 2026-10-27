import { StepStatus, TaskNode, TaskPlan } from '../agent/types';

export class PlanningEngine {
  /**
   * Deconstructs a goal into a validated TaskPlan DAG
   */
  public createPlanFromDecomposition(
    goal: string,
    rawSubtasks: Array<{
      id: string;
      title: string;
      description: string;
      dependencies: string[];
      tool?: string;
      args?: Record<string, any>;
    }>
  ): TaskPlan {
    const nodes: Record<string, TaskNode> = {};

    for (const raw of rawSubtasks) {
      nodes[raw.id] = {
        id: raw.id,
        title: raw.title,
        description: raw.description,
        type: raw.tool ? 'primitive' : 'composite',
        tool: raw.tool,
        args: raw.args,
        dependencies: raw.dependencies || [],
        status: 'pending',
        estimatedDurationMs: 1500,
      };
    }

    const rootNodes = Object.keys(nodes).filter((id) => nodes[id].dependencies.length === 0);
    const criticalPath = this.calculateCriticalPath(nodes);
    const parallelBatches = this.computeParallelBatches(nodes);

    return {
      id: `plan_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      goal,
      rootNodes,
      nodes,
      criticalPath,
      parallelBatches,
      checkpoints: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }

  /**
   * Computes executable batches of independent subtasks
   */
  public computeParallelBatches(nodes: Record<string, TaskNode>): string[][] {
    const batches: string[][] = [];
    const remaining = new Set(Object.keys(nodes));
    const completed = new Set<string>();

    while (remaining.size > 0) {
      const currentBatch: string[] = [];

      for (const id of remaining) {
        const node = nodes[id];
        const allDepsSatisfied = node.dependencies.every((d) => completed.has(d));
        if (allDepsSatisfied) {
          currentBatch.push(id);
        }
      }

      if (currentBatch.length === 0) {
        // Cyclic dependency fallback: grab first remaining
        const fallback = Array.from(remaining)[0];
        currentBatch.push(fallback);
      }

      batches.push(currentBatch);
      for (const id of currentBatch) {
        remaining.delete(id);
        completed.add(id);
      }
    }

    return batches;
  }

  /**
   * Identifies the critical path (longest dependency chain)
   */
  private calculateCriticalPath(nodes: Record<string, TaskNode>): string[] {
    const memo: Map<string, string[]> = new Map();

    const getLongestPath = (nodeId: string): string[] => {
      if (memo.has(nodeId)) return memo.get(nodeId)!;

      const node = nodes[nodeId];
      if (!node || node.dependencies.length === 0) {
        const res = [nodeId];
        memo.set(nodeId, res);
        return res;
      }

      let longestDepPath: string[] = [];
      for (const depId of node.dependencies) {
        const depPath = getLongestPath(depId);
        if (depPath.length > longestDepPath.length) {
          longestDepPath = depPath;
        }
      }

      const res = [...longestDepPath, nodeId];
      memo.set(nodeId, res);
      return res;
    };

    let overallLongest: string[] = [];
    for (const id of Object.keys(nodes)) {
      const path = getLongestPath(id);
      if (path.length > overallLongest.length) {
        overallLongest = path;
      }
    }

    return overallLongest;
  }

  /**
   * Updates status of a node and returns completion ratio
   */
  public updateNodeStatus(
    plan: TaskPlan,
    nodeId: string,
    status: StepStatus,
    result?: any,
    error?: string
  ): number {
    const node = plan.nodes[nodeId];
    if (node) {
      node.status = status;
      node.result = result;
      node.error = error;
      plan.updatedAt = Date.now();
    }

    const all = Object.values(plan.nodes);
    const done = all.filter((n) => n.status === 'completed' || n.status === 'skipped').length;
    return all.length === 0 ? 1 : done / all.length;
  }
}

export const planningEngine = new PlanningEngine();
