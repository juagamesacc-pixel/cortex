/**
 * Constants and Thresholds for Cortex ACS Engine
 */

export const ACS_CONFIG = {
  // Horizon Complexity Thresholds
  SHORT_HORIZON_MAX_COMPLEXITY: 0.35,
  MEDIUM_HORIZON_MAX_COMPLEXITY: 0.68,

  // ReAct Strategy Thresholds
  REACT_CONFIDENCE_ESCALATION_THRESHOLD: 0.32,
  REACT_CONSECUTIVE_LOW_CONFIDENCE_LIMIT: 2,
  REACT_MAX_STEPS: 8,
  REACT_FAILURE_RETRY_LIMIT: 2,

  // LATS (Language Agent Tree Search) Config
  LATS_EXPLORATION_CONSTANT: 1.414, // UCB1 sqrt(2)
  LATS_MAX_DEPTH: 5,
  LATS_MAX_ITERATIONS: 12,
  LATS_PRUNING_THRESHOLD: 0.25,

  // HTN Planning Config
  HTN_MAX_DECOMPOSITION_DEPTH: 4,
  HTN_MAX_PARALLEL_GROUP_SIZE: 3,

  // Storage and Memory
  WORKING_MEMORY_WINDOW_SIZE: 40,
  EPISODIC_SEARCH_TOP_K: 4,
  SEMANTIC_SEARCH_TOP_K: 5,

  // Tool Limits
  DEFAULT_TOOL_TIMEOUT_MS: 30000,
  MAX_TOOL_OUTPUT_BYTES: 1024 * 512, // 512 KB
} as const;

export const DEFAULT_SYSTEM_PROMPT = `You are Cortex, an advanced cognitive AI agent running on Android.
You possess a dual-process cognitive architecture (System 1 reactive and System 2 deliberative planning).
You can execute native bash shell commands, inspect and manipulate the filesystem, perform HTTP network operations, and access device capabilities via your native bridge.
Always think critically, verify assumptions with tools, evaluate your own progress with self-reflection, and deliver aesthetic, robust, production-quality outcomes.`;
