/**
 * Core Type Definitions for Cortex Agentic Architecture
 */

export type HorizonType = 'short' | 'medium' | 'long';
export type StrategyType = 'react' | 'htn' | 'lats';

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'aborted';
export type StepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

export interface ToolCall {
  id: string;
  tool: string;
  args: Record<string, any>;
}

export interface ToolExecutionResult {
  toolCallId: string;
  tool: string;
  success: boolean;
  output: string;
  error?: string;
  durationMs: number;
}

export interface ReActStep {
  index: number;
  thought: string;
  action?: ToolCall;
  observation?: string;
  confidence: number;
  durationMs: number;
  timestamp: number;
}

export interface TaskNode {
  id: string;
  title: string;
  description: string;
  type: 'composite' | 'primitive';
  tool?: string;
  args?: Record<string, any>;
  dependencies: string[]; // IDs of tasks that must finish before this
  status: StepStatus;
  estimatedDurationMs: number;
  actualDurationMs?: number;
  result?: any;
  error?: string;
}

export interface TaskPlan {
  id: string;
  goal: string;
  rootNodes: string[];
  nodes: Record<string, TaskNode>;
  criticalPath: string[];
  parallelBatches: string[][];
  checkpoints: Array<{
    nodeId: string;
    snapshotState: string;
    timestamp: number;
  }>;
  createdAt: number;
  updatedAt: number;
}

export interface LATSNode {
  id: string;
  depth: number;
  stateDescription: string;
  action: ToolCall | null;
  observation?: string;
  parentId: string | null;
  childIds: string[];
  visits: number;
  totalReward: number;
  averageReward: number;
  isTerminal: boolean;
}

export interface ComplexityAssessment {
  taskDescription: string;
  subtaskCountEstimate: number;
  dependencyDepth: number;
  ambiguityScore: number;     // 0..1
  noveltyScore: number;       // 0..1
  toolDiversityScore: number; // 0..1
  memoryMatchScore: number;   // 0..1
  calculatedComplexity: number; // 0..1
  horizonClass: HorizonType;
  recommendedStrategy: StrategyType;
  reasoning: string;
  riskFactors: string[];
}

export interface Reflection {
  timestamp: number;
  actionSummary: string;
  outcomeAssessment: string;
  surpriseLevel: number; // 0..1
  lessonsLearned: string[];
  planAdjustmentRequired: boolean;
  confidenceDelta: number;
}

export interface CriticIssue {
  severity: 'minor' | 'major' | 'critical';
  aspect: string;
  description: string;
  suggestion: string;
}

export interface CriticPass {
  target: string;
  verificationToolsUsed: string[];
  issues: CriticIssue[];
  passed: boolean;
  confidence: number;
  suggestedRevision?: string;
}

export interface AgentLifecycleEvent {
  type:
    | 'perceiving'
    | 'horizon_assessed'
    | 'strategy_selected'
    | 'horizon_switched'
    | 'thinking'
    | 'tool_start'
    | 'tool_chunk'
    | 'tool_end'
    | 'reflecting'
    | 'plan_updated'
    | 'memory_updated'
    | 'critic_pass'
    | 'completed'
    | 'error';
  timestamp: number;
  payload: any;
}

export type AgentEventListener = (event: AgentLifecycleEvent) => void;
