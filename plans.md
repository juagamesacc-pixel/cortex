# Cortex — Adaptive Cognitive AI Agent for Android

## Executive Summary

Cortex is a fully self-contained AI agent platform for Android. The entire cognitive
architecture — reasoning, planning, memory, tool-use, and reflection — lives in a
React/TypeScript frontend. A native Android host app acts purely as an execution bridge,
receiving structured commands from the JS layer and executing them via native APIs
(shell, filesystem, networking, sensors). The system dynamically switches between
short-horizon reactive execution and long-horizon deliberative planning based on
real-time task complexity analysis.

---

## Table of Contents

1. [Architecture Decision: Execution Layer](#1-architecture-decision-execution-layer)
2. [System Architecture Overview](#2-system-architecture-overview)
3. [Agentic Cognitive Architecture (ACS)](#3-agentic-cognitive-architecture-acs)
4. [Dynamic Horizon Management](#4-dynamic-horizon-management)
5. [Memory System](#5-memory-system)
6. [Tool & Execution System](#6-tool--execution-system)
7. [LLM Integration Layer](#7-llm-integration-layer)
8. [Android Host App Design](#8-android-host-app-design)
9. [Bridge Protocol Specification](#9-bridge-protocol-specification)
10. [UI/UX Design System](#10-uiux-design-system)
11. [Project Structure](#11-project-structure)
12. [Tech Stack](#12-tech-stack)
13. [Implementation Phases](#13-implementation-phases)
14. [Security Model](#14-security-model)
15. [Testing Strategy](#15-testing-strategy)

---

## 1. Architecture Decision: Execution Layer

### Options Analyzed

| Approach | Pros | Cons | Verdict |
|----------|------|------|---------|
| **Shell via ProcessBuilder** | Universal, lightweight, zero extra runtime | String parsing for complex output | ✅ **Primary** |
| **Chaquopy (Python)** | Rich ML ecosystem, numpy/pandas | +50MB APK, cold start 2-5s, version lock | ❌ Reject |
| **Node.js Mobile** | Same language as frontend | Unstable ARM64, 30MB+ binary, abandoned | ❌ Reject |
| **Hybrid Shell + Detected Runtimes** | Best of both worlds | Requires runtimes pre-installed | ⚡ **Addon** |

### Decision: Tiered Execution Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Cortex JS Layer                    │
│  (React App — UI + Cognitive Architecture)           │
├─────────────────────────────────────────────────────┤
│                    Bridge Protocol                   │
│            (Structured JSON Messages)                │
├──────────┬──────────┬──────────┬────────────────────┤
│  Tier 1  │  Tier 2  │  Tier 3  │      Tier 4        │
│  Shell   │ Struct.  │ Runtime  │    System APIs      │
│ Executor │   I/O    │ Plugins  │  (Sensors, Notif.)  │
│ (bash/sh)│(File,Net)│(py,ruby) │                     │
└──────────┴──────────┴──────────┴────────────────────┘
│              Android Native Host                     │
└─────────────────────────────────────────────────────┘
```

- **Tier 1 — Shell Executor**: `ProcessBuilder` runs bash/sh commands with streaming
  stdout/stderr. Handles command chaining, pipes, environment variables. Supports
  timeout, cancellation, and working directory specification.
- **Tier 2 — Structured Executors**: Dedicated bridge methods for file CRUD, HTTP
  requests, JSON/SQLite operations. No shell overhead, proper error typing.
- **Tier 3 — Runtime Plugins**: Auto-detect installed runtimes (python3, ruby, node)
  and expose them as tool capabilities. If Python exists, the agent can use it for
  data processing. Zero mandatory dependencies.
- **Tier 4 — System APIs**: Notifications, clipboard, vibration, battery status,
  network state, device info. Direct Android API calls.

---

## 2. System Architecture Overview

```
┌────────────────────────────────────────────────────────────────┐
│                     Android Host App (Kotlin)                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    WebView Container                      │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │              Cortex React Application               │  │  │
│  │  │                                                    │  │  │
│  │  │  ┌──────────┐  ┌──────────┐  ┌────────────────┐  │  │  │
│  │  │  │    UI    │  │  Agent   │  │    Memory       │  │  │  │
│  │  │  │  Layer   │◄─┤  Core    │◄─┤    System       │  │  │  │
│  │  │  │ (React)  │  │  (ACS)   │  │ (IndexedDB)    │  │  │  │
│  │  │  └──────────┘  └────┬─────┘  └────────────────┘  │  │  │
│  │  │                     │                              │  │  │
│  │  │              ┌──────▼──────┐                       │  │  │
│  │  │              │   Bridge    │                       │  │  │
│  │  │              │   Client    │                       │  │  │
│  │  │              └──────┬──────┘                       │  │  │
│  │  └─────────────────────┼──────────────────────────────┘  │  │
│  │                        │ @JavascriptInterface             │  │
│  │                        │ + WebSocket (streaming)           │  │
│  │  ┌─────────────────────▼──────────────────────────────┐  │  │
│  │  │              Native Bridge Layer                    │  │  │
│  │  │  ┌─────────┐ ┌─────────┐ ┌────────┐ ┌──────────┐ │  │  │
│  │  │  │  Shell   │ │  File   │ │  HTTP  │ │ System   │ │  │  │
│  │  │  │Executor │ │  System │ │ Client │ │  APIs    │ │  │  │
│  │  │  └─────────┘ └─────────┘ └────────┘ └──────────┘ │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
```

### Data Flow

1. User input → React UI → Agent Core
2. Agent Core reasons about the task → selects strategy → generates action plan
3. Actions requiring native execution → Bridge Client → Android Bridge → Native execution
4. Results flow back: Native → Bridge → Agent Core → Reflection → UI update
5. Memory system persists learnings in IndexedDB (durable, no server needed)

---

## 3. Agentic Cognitive Architecture (ACS)

### 3.1 Philosophy

The Adaptive Cognitive System (ACS) is inspired by dual-process theory from cognitive
science (Kahneman's System 1/System 2), combined with state-of-the-art agentic
techniques:

- **System 1 (Fast/Reactive)**: ReAct loops for simple tasks — think, act, observe
- **System 2 (Slow/Deliberative)**: LATS/MCTS-guided planning for complex tasks
- **Meta-Cognition**: A monitoring layer that decides WHICH system to engage and
  WHEN to switch between them

### 3.2 Core Cognitive Loop

```
                    ┌─────────────────┐
                    │   USER INPUT    │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │   PERCEPTION    │
                    │  Parse, classify│
                    │  extract intent │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  META-COGNITION │ ◄──── Continuous monitoring
                    │  Assess horizon │       Re-evaluate on each step
                    │  Select strategy│
                    └────────┬────────┘
                             │
               ┌─────────────┼─────────────┐
               │             │             │
      ┌────────▼───┐  ┌─────▼──────┐ ┌────▼────────┐
      │  REACTIVE  │  │ DELIBERATE │ │ EXPLORATORY  │
      │  (ReAct)   │  │ (Plan+Exec)│ │ (LATS/MCTS)  │
      │            │  │            │ │              │
      │ Think→Act  │  │ Decompose  │ │ Tree search  │
      │ →Observe   │  │ →Schedule  │ │ →Simulate    │
      │ →Repeat    │  │ →Execute   │ │ →Backtrack   │
      └──────┬─────┘  └─────┬──────┘ └──────┬───────┘
             │               │               │
             └───────────────┼───────────────┘
                             │
                    ┌────────▼────────┐
                    │    EXECUTION    │
                    │  Tool dispatch  │
                    │  Stream results │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │   REFLECTION    │
                    │  Verify output  │
                    │  Self-critique  │
                    │  Extract pattern│
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │     MEMORY      │
                    │  Store trace    │
                    │  Update beliefs │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │    RESPONSE     │
                    │  To user / next │
                    │  action step    │
                    └─────────────────┘
```

### 3.3 Reasoning Strategies (Detail)

#### 3.3.1 ReAct (Reactive Reasoning + Acting)

Used for short-horizon tasks (1-5 steps). The agent alternates between:
- **Thought**: Internal reasoning about what to do next
- **Action**: Execute a tool/command
- **Observation**: Process the result
- **Repeat** until task is complete or escalation is triggered

```typescript
interface ReActStep {
  thought: string;        // Why am I doing this?
  action: ToolCall;       // What tool to invoke
  observation: string;    // What happened?
  confidence: number;     // 0-1 confidence in progress
}
```

Escalation triggers (switch to deliberative):
- Confidence drops below 0.3 for 2+ consecutive steps
- Step count exceeds 5x initial estimate
- Repeated tool failures (3+ on same operation)
- User explicitly asks for a plan

#### 3.3.2 Hierarchical Task Network (HTN) Planning

Used for medium-horizon tasks (5-20 steps). Decomposes tasks into a DAG:

```typescript
interface TaskNode {
  id: string;
  description: string;
  type: 'composite' | 'primitive';
  children?: TaskNode[];      // Sub-tasks (for composite)
  tool?: string;              // Tool to use (for primitive)
  dependencies: string[];     // Must complete before this
  status: 'pending' | 'running' | 'done' | 'failed' | 'skipped';
  retryPolicy: RetryPolicy;
  estimatedSteps: number;
  actualSteps: number;
}

interface TaskPlan {
  root: TaskNode;
  criticalPath: string[];     // Longest dependency chain
  parallelGroups: string[][]; // Tasks that can run in parallel
  checkpoints: Checkpoint[];  // Rollback points
}
```

Features:
- Automatic parallelism detection (independent subtasks run concurrently)
- Critical path analysis (optimize the bottleneck)
- Checkpoint-based rollback on failure
- Dynamic re-planning when subtasks fail or new info emerges

#### 3.3.3 LATS (Language Agent Tree Search)

Used for long-horizon tasks (20+ steps) or high-uncertainty tasks. Combines Monte
Carlo Tree Search with LLM-based evaluation:

```typescript
interface LATSNode {
  state: AgentState;          // Current world state
  action: ToolCall | null;    // Action that led here
  parent: LATSNode | null;
  children: LATSNode[];
  visits: number;             // MCTS visit count
  totalReward: number;        // Cumulative reward
  depth: number;
  isTerminal: boolean;
}

interface LATSConfig {
  maxIterations: number;      // MCTS rollout budget
  explorationConstant: number; // UCB1 exploration parameter (√2)
  maxDepth: number;           // Max tree depth
  evaluationStrategy: 'llm' | 'heuristic' | 'hybrid';
  pruningThreshold: number;   // Min reward to keep branch
}
```

MCTS Phases:
1. **Selection**: UCB1 to pick most promising branch
2. **Expansion**: LLM generates possible next actions
3. **Simulation**: LLM evaluates likely outcome of action sequence
4. **Backpropagation**: Update reward estimates up the tree

This gives us:
- Exploration of multiple solution paths
- Backtracking when a path fails
- Optimal action selection under uncertainty
- Budget-aware planning (stop when confident enough)

#### 3.3.4 Self-Discover

Before executing any strategy, the agent can activate Self-Discover to find the
optimal reasoning structure for the specific task:

```typescript
interface ReasoningModule {
  name: string;               // e.g., "Critical Thinking", "Creative Brainstorming"
  description: string;
  applicability: string[];    // Task types this module helps with
}

// The agent selects, adapts, and composes reasoning modules
// into a task-specific reasoning structure
interface DiscoveredStructure {
  selectedModules: ReasoningModule[];
  compositionPlan: string;    // How to combine them
  executionOrder: string[];   // Sequence of reasoning steps
}
```

### 3.4 Reflection Engine

Every action produces a reflection cycle:

```typescript
interface Reflection {
  actionSummary: string;      // What did we just do?
  outcomeAssessment: string;  // Did it work? How well?
  surpriseLevel: number;      // 0-1, how unexpected was the result?
  lessonsLearned: string[];   // What can we learn from this?
  planAdjustment?: string;    // Should we change the plan?
  confidenceDelta: number;    // How did this affect overall confidence?
}
```

Reflection modes:
- **Step Reflection**: After each action (lightweight, always on)
- **Milestone Reflection**: After completing a subtask (medium, analyzes trajectory)
- **Task Reflection**: After completing entire task (deep, extracts patterns for memory)
- **Failure Reflection**: On error (intensive, root cause analysis + alternative generation)

### 3.5 Critic System (CRITIC-inspired)

The agent can invoke a Critic pass that:
1. Takes the current output/result
2. Uses tools to VERIFY claims (e.g., run tests, check file contents)
3. Generates critique with specific issues
4. Revises the output based on critique
5. Optionally repeats until quality threshold is met

```typescript
interface CriticPass {
  target: string;             // What to critique (code, plan, answer)
  verificationTools: string[]; // Tools used to verify
  issues: CriticIssue[];
  severity: 'minor' | 'major' | 'critical';
  revision?: string;          // Revised output
  confidence: number;
}
```

---

## 4. Dynamic Horizon Management

### 4.1 Complexity Oracle

The Complexity Oracle runs on every new task and continuously during execution:

```typescript
interface ComplexityAssessment {
  // Input features
  taskDescription: string;
  estimatedSubtasks: number;
  dependencyDepth: number;    // Max depth of dependency chain
  ambiguityScore: number;     // 0-1, how ambiguous is the task?
  noveltyScore: number;       // 0-1, how novel vs. seen patterns?
  toolDiversity: number;      // Number of different tools likely needed
  
  // Output
  horizonClass: 'short' | 'medium' | 'long';
  confidenceInEstimate: number;
  recommendedStrategy: 'react' | 'htn' | 'lats';
  estimatedTotalSteps: number;
  riskFactors: string[];
}
```

### 4.2 Scoring Formula

```
complexity = (
  0.25 * subtaskCount / maxSubtasks +
  0.20 * dependencyDepth / maxDepth +
  0.20 * ambiguityScore +
  0.15 * noveltyScore +
  0.10 * toolDiversity / maxTools +
  0.10 * (1 - memoryMatchScore)  // Less similar to known tasks = harder
)

horizon = complexity < 0.3 ? 'short'
        : complexity < 0.65 ? 'medium'
        : 'long'
```

### 4.3 Dynamic Switching Protocol

```
┌──────────────┐
│  Task Start  │
│ Assess: SHORT│
└──────┬───────┘
       │
       ▼
┌──────────────┐     confidence < 0.3     ┌──────────────┐
│   ReAct      │ ─── for 2+ steps ──────► │   Escalate   │
│   Loop       │                          │   to HTN     │
└──────┬───────┘                          └──────┬───────┘
       │                                         │
       │ success                                 ▼
       │                                  ┌──────────────┐
       ▼                                  │ HTN Planning │
┌──────────────┐     subtask fails ──────►│ + Execute    │
│   Complete   │     3+ times             │              │
└──────────────┘                          └──────┬───────┘
                                                 │
                                    failure      │ success
                                    ┌────────────┤
                                    ▼            ▼
                              ┌──────────┐ ┌──────────┐
                              │ Escalate │ │ Complete  │
                              │ to LATS  │ └──────────┘
                              └──────────┘
```

**Downgrade** (Long → Short) triggers:
- Remaining subtasks are all simple/independent
- 80%+ of plan completed successfully
- Agent realizes task was overestimated

**Upgrade** (Short → Long) triggers:
- Repeated failures (3+ retries on same step)
- Discovered hidden complexity (subtask generated more subtasks)
- Confidence consistently dropping
- User intervention suggesting "think more carefully"

---

## 5. Memory System

### 5.1 Memory Architecture

```
┌──────────────────────────────────────────────────┐
│                 Memory Manager                    │
├──────────┬──────────┬───────────┬────────────────┤
│ Working  │ Episodic │ Semantic  │  Procedural    │
│ Memory   │ Memory   │ Memory   │  Memory        │
│          │          │          │                │
│ Current  │ Past     │ Facts &  │ Compiled       │
│ context, │ task     │ patterns,│ action         │
│ active   │ traces   │ tool     │ sequences      │
│ plan,    │ with     │ usage    │ for common     │
│ recent   │ outcomes │ stats,   │ tasks          │
│ actions  │          │ user     │                │
│          │          │ prefs    │                │
├──────────┴──────────┴───────────┴────────────────┤
│        Storage: IndexedDB (via Dexie.js)         │
│        Vector Index: In-memory HNSW              │
└──────────────────────────────────────────────────┘
```

### 5.2 Working Memory

```typescript
interface WorkingMemory {
  currentTask: Task;
  activePlan: TaskPlan | null;
  recentActions: ActionTrace[];      // Last N actions with results
  contextWindow: ContextItem[];      // Relevant context assembled from other memories
  scratchpad: Map<string, any>;      // Agent's working notes
  activeGoals: Goal[];               // Stack of active goals
  environmentState: EnvironmentState; // Current file system, running processes, etc.
}
```

Capacity management:
- Rolling window of last 50 actions (configurable)
- Context window dynamically assembled based on relevance
- Least-recently-used eviction for scratchpad entries
- Summary compression for old actions (keep summary, discard raw output)

### 5.3 Episodic Memory

Stores complete task execution traces for learning:

```typescript
interface Episode {
  id: string;
  timestamp: number;
  taskDescription: string;
  taskEmbedding: number[];           // For similarity search
  strategy: 'react' | 'htn' | 'lats';
  trajectory: ActionTrace[];
  outcome: 'success' | 'partial' | 'failure';
  totalSteps: number;
  totalDuration: number;
  reflections: Reflection[];
  lessonsLearned: string[];
  tags: string[];                    // Auto-generated tags
}
```

Retrieval:
- Embedding-based similarity search (find past tasks similar to current)
- Tag-based filtering
- Recency weighting (recent episodes preferred)
- Outcome weighting (successful episodes preferred)

### 5.4 Semantic Memory

Long-term knowledge base:

```typescript
interface SemanticFact {
  id: string;
  content: string;                   // The fact/knowledge
  embedding: number[];
  source: 'extracted' | 'user' | 'observed';
  confidence: number;                // 0-1, may decay over time
  lastAccessed: number;
  accessCount: number;
  domain: string;                    // e.g., "python", "android", "user-preferences"
}
```

Auto-populated from:
- Task reflections (lessons learned → semantic facts)
- User corrections ("actually, I prefer X over Y")
- Repeated observations ("command X always needs sudo on this device")
- Tool usage statistics (success rates, common arguments)

### 5.5 Procedural Memory (Voyager-inspired Skill Library)

Compiled, reusable action sequences:

```typescript
interface Procedure {
  id: string;
  name: string;                      // Human-readable name
  description: string;
  triggerConditions: string[];       // When to suggest this procedure
  steps: ProcedureStep[];
  parameters: ProcedureParam[];      // Configurable inputs
  successRate: number;               // Historical success rate
  avgDuration: number;
  lastUsed: number;
  embedding: number[];               // For retrieval
}

interface ProcedureStep {
  tool: string;
  argsTemplate: Record<string, string>; // Template with parameter references
  expectedOutput?: string;
  onFailure: 'retry' | 'skip' | 'abort';
}
```

Skill acquisition:
1. After a successful task, the Reflection Engine identifies reusable patterns
2. Generalizes the specific trace into a parameterized procedure
3. Stores it with trigger conditions for future retrieval
4. On similar future tasks, suggests the procedure (user can approve/modify)

### 5.6 Vector Store (Lightweight HNSW)

In-memory vector similarity search for retrieval:

```typescript
interface VectorStore {
  // Core operations
  add(id: string, embedding: number[], metadata: any): void;
  search(query: number[], topK: number): SearchResult[];
  remove(id: string): void;
  
  // Configuration
  dimensions: number;       // Embedding dimensions (384 for MiniLM)
  metric: 'cosine' | 'euclidean';
  efConstruction: number;   // HNSW build quality
  efSearch: number;          // HNSW search quality
  maxElements: number;
}
```

Embedding generation:
- Use a lightweight model (all-MiniLM-L6-v2 via ONNX.js) running in the WebView
- Or fallback to LLM-generated embeddings if ONNX is too heavy
- Or use a simple TF-IDF based approach as minimum viable option

---

## 6. Tool & Execution System

### 6.1 Tool Architecture

```typescript
abstract class BaseTool {
  abstract name: string;
  abstract description: string;
  abstract parameters: ToolParameter[];
  
  // Schema for LLM function calling
  abstract get schema(): FunctionSchema;
  
  // Execute with full lifecycle
  async execute(args: Record<string, any>): Promise<ToolResult> {
    this.validate(args);
    const result = await this.run(args);
    return this.formatResult(result);
  }
  
  // Subclasses implement
  protected abstract run(args: Record<string, any>): Promise<any>;
  
  // Retry with exponential backoff
  async executeWithRetry(args: Record<string, any>, maxRetries: number): Promise<ToolResult>;
}

interface ToolResult {
  success: boolean;
  output: string;
  error?: string;
  metadata?: Record<string, any>;
  duration: number;
  artifacts?: Artifact[];   // Files created, URLs fetched, etc.
}
```

### 6.2 Built-in Tools

| Tool | Description | Bridge Tier |
|------|-------------|-------------|
| `bash` | Execute shell commands with streaming output | Tier 1 |
| `file_read` | Read file contents (text, binary as base64) | Tier 2 |
| `file_write` | Write/append to files | Tier 2 |
| `file_list` | List directory contents with metadata | Tier 2 |
| `file_search` | Search files by name/content pattern | Tier 2 |
| `http_request` | Make HTTP requests (GET, POST, etc.) | Tier 2 |
| `code_generate` | Generate code using LLM | Internal |
| `code_edit` | Edit existing code (search & replace, patch) | Internal |
| `web_search` | Search the web via API | Tier 2 |
| `python_exec` | Execute Python script (if available) | Tier 3 |
| `clipboard` | Read/write clipboard | Tier 4 |
| `notification` | Show Android notification | Tier 4 |
| `device_info` | Get device information | Tier 4 |

### 6.3 Tool Registry

```typescript
class ToolRegistry {
  private tools: Map<string, BaseTool> = new Map();
  private usageStats: Map<string, ToolStats> = new Map();
  
  register(tool: BaseTool): void;
  unregister(name: string): void;
  get(name: string): BaseTool;
  
  // Return all tools as function schemas for LLM
  getSchemas(): FunctionSchema[];
  
  // Dynamic tool availability (based on bridge capabilities)
  getAvailableTools(): BaseTool[];
  
  // Usage analytics
  recordUsage(name: string, result: ToolResult): void;
  getStats(name: string): ToolStats;
  
  // Auto-discover tools from bridge capabilities
  async discoverBridgeCapabilities(): Promise<string[]>;
}
```

### 6.4 Execution Sandbox

Safety measures for tool execution:
- **Timeout**: Every tool call has a configurable timeout (default 30s, max 5min)
- **Approval Gates**: Destructive operations (rm, overwrite) require user approval
- **Working Directory Jail**: Operations constrained to approved directories
- **Resource Limits**: Max output size (1MB), max concurrent executions (3)
- **Audit Log**: Every tool invocation is logged with full args and results

---

## 7. LLM Integration Layer

### 7.1 Provider Abstraction

```typescript
interface LLMProvider {
  name: string;
  
  // Core completion
  complete(messages: Message[], options: CompletionOptions): Promise<Completion>;
  
  // Streaming completion
  stream(messages: Message[], options: CompletionOptions): AsyncIterable<StreamChunk>;
  
  // Function/tool calling
  completeWithTools(
    messages: Message[],
    tools: FunctionSchema[],
    options: CompletionOptions
  ): Promise<ToolCompletion>;
  
  // Embeddings (if supported)
  embed?(texts: string[]): Promise<number[][]>;
}

interface CompletionOptions {
  model: string;
  temperature: number;
  maxTokens: number;
  topP?: number;
  stopSequences?: string[];
  systemPrompt?: string;
  responseFormat?: 'text' | 'json';
}
```

### 7.2 Supported Providers

- **OpenAI** (GPT-4o, GPT-4.1, o3-mini, o4-mini)
- **Anthropic** (Claude Sonnet 4, Claude Opus 4)
- **Google** (Gemini 2.5 Pro, Gemini 2.5 Flash)
- **Groq** (Llama 3.3 70B, Mixtral) — for fast/cheap reasoning
- **Local/Ollama** (any local model via HTTP)
- **OpenRouter** (unified gateway to all providers)

### 7.3 Prompt Engineering System

```typescript
class PromptManager {
  // Template registry with variable interpolation
  private templates: Map<string, PromptTemplate>;
  
  // Compose a prompt from template + context
  compose(
    templateName: string,
    variables: Record<string, string>,
    context: ContextItem[]
  ): Message[];
  
  // Dynamic system prompt based on task type
  buildSystemPrompt(
    taskType: string,
    availableTools: FunctionSchema[],
    memoryContext: string,
    userPreferences: Record<string, string>
  ): string;
  
  // Few-shot examples from episodic memory
  selectExamples(
    currentTask: string,
    episodicMemory: Episode[],
    maxExamples: number
  ): Message[];
}
```

### 7.4 Intelligent Model Routing

The system auto-selects the best model for each sub-task:

| Sub-task | Model Selection | Rationale |
|----------|----------------|-----------|
| Simple Q&A | Gemini Flash / Groq | Speed, low cost |
| Code generation | GPT-4.1 / Claude Sonnet | Best code quality |
| Complex reasoning | Claude Opus / o3 | Deep thinking |
| Planning | GPT-4o / Claude Sonnet | Good structure |
| Reflection | Gemini Flash | Fast iteration |
| Embeddings | Local MiniLM or API | Cheapest option |

```typescript
interface ModelRouter {
  selectModel(task: SubTaskType, constraints: RoutingConstraints): ModelConfig;
}

interface RoutingConstraints {
  maxLatencyMs?: number;
  maxCostPer1kTokens?: number;
  requiredCapabilities?: ('function_calling' | 'vision' | 'json_mode')[];
  preferLocal?: boolean;
}
```

---

## 8. Android Host App Design

### 8.1 Architecture

The Android app is intentionally minimal — a "smart shell" for the React app:

```kotlin
// Core components
MainActivity : AppCompatActivity
├── CortexWebView          // Custom WebView with JS bridge
├── BridgeRouter            // Routes bridge calls to executors
├── ShellExecutor           // ProcessBuilder wrapper with streaming
├── FileSystemExecutor      // File operations
├── HttpExecutor            // OkHttp-based HTTP client
├── SystemExecutor          // Device info, notifications, clipboard
├── ExecutionService        // Foreground service for long-running tasks
└── SecurityManager         // Permission checks, sandboxing
```

### 8.2 WebView Configuration

```kotlin
class CortexWebView(context: Context) : WebView(context) {
    init {
        settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true           // IndexedDB support
            databaseEnabled = true
            allowFileAccess = true
            allowContentAccess = true
            cacheMode = WebSettings.LOAD_NO_CACHE
            mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
            setSupportMultipleWindows(false)
            
            // Performance
            setRenderPriority(WebSettings.RenderPriority.HIGH)
            setLayerType(View.LAYER_TYPE_HARDWARE, null)
        }
        
        // Register JS bridge
        addJavascriptInterface(CortexBridge(context), "CortexNative")
        
        // Load React app from assets
        loadUrl("file:///android_asset/cortex/index.html")
    }
}
```

### 8.3 Bridge Implementation

```kotlin
class CortexBridge(private val context: Context) {
    private val shellExecutor = ShellExecutor()
    private val fileSystem = FileSystemExecutor()
    private val httpClient = HttpExecutor()
    
    // ─── Tier 1: Shell Execution ───
    
    @JavascriptInterface
    fun executeCommand(requestJson: String): String {
        val request = Json.decodeFromString<ShellRequest>(requestJson)
        return shellExecutor.execute(request).toJson()
    }
    
    @JavascriptInterface
    fun executeCommandAsync(requestId: String, requestJson: String) {
        // Runs in background, streams results via evaluateJavascript callback
        CoroutineScope(Dispatchers.IO).launch {
            val request = Json.decodeFromString<ShellRequest>(requestJson)
            shellExecutor.executeStreaming(request) { chunk ->
                webView.evaluateJavascript(
                    "window.__cortexBridge.onStreamChunk('$requestId', '${chunk.escape()}')",
                    null
                )
            }
        }
    }
    
    // ─── Tier 2: Structured I/O ───
    
    @JavascriptInterface
    fun readFile(path: String): String { ... }
    
    @JavascriptInterface
    fun writeFile(path: String, content: String): String { ... }
    
    @JavascriptInterface
    fun listDirectory(path: String): String { ... }
    
    @JavascriptInterface
    fun httpRequest(requestJson: String): String { ... }
    
    // ─── Tier 3: Runtime Detection ───
    
    @JavascriptInterface
    fun getAvailableRuntimes(): String {
        val runtimes = mutableListOf<String>()
        if (shellExecutor.commandExists("python3")) runtimes.add("python3")
        if (shellExecutor.commandExists("node")) runtimes.add("node")
        if (shellExecutor.commandExists("ruby")) runtimes.add("ruby")
        return Json.encodeToString(runtimes)
    }
    
    // ─── Tier 4: System APIs ───
    
    @JavascriptInterface
    fun showNotification(title: String, body: String): String { ... }
    
    @JavascriptInterface
    fun getDeviceInfo(): String { ... }
    
    @JavascriptInterface
    fun getClipboard(): String { ... }
    
    @JavascriptInterface
    fun setClipboard(text: String): String { ... }
}
```

### 8.4 Shell Executor (Detail)

```kotlin
class ShellExecutor {
    fun execute(request: ShellRequest): ShellResult {
        val pb = ProcessBuilder("/system/bin/sh", "-c", request.command).apply {
            environment().putAll(request.env)
            directory(File(request.workingDir ?: "/data/data/com.cortex/"))
            redirectErrorStream(request.mergeStderr)
        }
        
        val process = pb.start()
        val stdout = StringBuilder()
        val stderr = StringBuilder()
        
        // Read with timeout
        val completed = process.waitFor(request.timeoutMs, TimeUnit.MILLISECONDS)
        
        if (!completed) {
            process.destroyForcibly()
            return ShellResult(
                exitCode = -1,
                stdout = stdout.toString(),
                stderr = "Timeout after ${request.timeoutMs}ms",
                timedOut = true
            )
        }
        
        return ShellResult(
            exitCode = process.exitValue(),
            stdout = process.inputStream.bufferedReader().readText(),
            stderr = process.errorStream.bufferedReader().readText(),
            timedOut = false
        )
    }
    
    fun executeStreaming(request: ShellRequest, onChunk: (String) -> Unit) {
        // Streams output line-by-line for real-time feedback
    }
}
```

### 8.5 Foreground Service

For long-running agent tasks, the Android app maintains a foreground service:

```kotlin
class ExecutionService : Service() {
    // Keeps the app alive during long-running tasks
    // Shows a persistent notification with task status
    // Handles wake locks for CPU-intensive operations
    // Gracefully handles process death and restoration
}
```

---

## 9. Bridge Protocol Specification

### 9.1 Message Format

All bridge communication uses JSON:

```typescript
// JS → Android
interface BridgeRequest {
  id: string;              // Unique request ID
  method: string;          // Bridge method name
  params: Record<string, any>;
  timeout?: number;        // Timeout in ms
  streaming?: boolean;     // Whether to expect streaming response
}

// Android → JS (sync response)
interface BridgeResponse {
  id: string;              // Matches request ID
  success: boolean;
  data?: any;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  duration: number;        // Execution time in ms
}

// Android → JS (streaming chunk)
interface BridgeStreamChunk {
  id: string;              // Matches request ID
  type: 'stdout' | 'stderr' | 'progress' | 'complete' | 'error';
  data: string;
  timestamp: number;
}
```

### 9.2 Bridge Client (JS Side)

```typescript
class BridgeClient {
  private pendingRequests: Map<string, PromiseResolver> = new Map();
  private streamHandlers: Map<string, StreamHandler> = new Map();
  
  // Check if running in Android WebView
  get isNative(): boolean {
    return typeof window.CortexNative !== 'undefined';
  }
  
  // Synchronous call (blocks until response)
  async call(method: string, params: Record<string, any>): Promise<BridgeResponse> {
    if (!this.isNative) return this.mockCall(method, params);
    
    const id = crypto.randomUUID();
    const request: BridgeRequest = { id, method, params };
    const response = window.CortexNative[method](JSON.stringify(request));
    return JSON.parse(response);
  }
  
  // Async call with streaming support
  async callStreaming(
    method: string,
    params: Record<string, any>,
    onChunk: (chunk: BridgeStreamChunk) => void
  ): Promise<BridgeResponse> { ... }
  
  // Mock implementations for browser development
  private async mockCall(method: string, params: any): Promise<BridgeResponse> { ... }
}
```

### 9.3 Development Mode

When running in a regular browser (not Android WebView), the Bridge Client
automatically switches to a mock mode that simulates native responses. This allows
full development and testing of the React app + agent logic without needing the
Android app.

The mock bridge can:
- Simulate shell execution (limited subset)
- Use browser APIs for file operations (via File System Access API or in-memory)
- Make HTTP requests directly
- Stub system APIs

---

## 10. UI/UX Design System

### 10.1 Design Philosophy

Material Design 3 (Material You) with these aesthetic principles:
- **Depth**: Layered surfaces with elevation and shadows
- **Motion**: Meaningful, physics-based animations
- **Clarity**: Information hierarchy through typography and spacing
- **Personality**: Dynamic color theming, subtle glassmorphism accents
- **Transparency**: Agent's thinking process visible and inspectable

### 10.2 Color System

```typescript
// Material You dynamic color palette
interface CortexTheme {
  // Primary palette (user customizable)
  primary: string;          // Main brand color
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  
  // Surface layers
  surface: string;          // Background
  surfaceContainer: string; // Cards
  surfaceContainerHigh: string; // Elevated cards
  surfaceBright: string;    // Highlighted areas
  
  // Semantic
  success: string;          // Action succeeded
  warning: string;          // Needs attention
  error: string;            // Action failed
  info: string;             // Informational
  
  // Agent-specific
  agentThinking: string;    // Subtle pulse color for reasoning
  agentActing: string;      // Action execution color
  agentReflecting: string;  // Reflection color
}

// Default palette: Deep indigo primary with warm accents
const defaultTheme: CortexTheme = {
  primary: '#6750A4',
  surface: '#1C1B1F',
  surfaceContainer: '#211F26',
  agentThinking: '#E8DEF8',
  agentActing: '#D0BCFF',
  agentReflecting: '#CCC2DC',
  // ...
};
```

### 10.3 Component Library

#### Chat Interface
- **Message Bubbles**: Rounded corners, subtle shadow, distinct styles for user/agent
- **Thinking Indicator**: Animated neural-network-like visualization while reasoning
- **Code Blocks**: Syntax highlighted with copy button, line numbers
- **Tool Execution Cards**: Expandable cards showing tool name, args, output
- **Plan Visualization**: Interactive tree/DAG of the current execution plan
- **Memory Browser**: Searchable interface to explore agent memories

#### Layout
```
┌──────────────────────────────────────┐
│  ╔══════════════════════════════╗    │
│  ║  Cortex     [⚙]  [◉]  [≡]  ║    │ ← App bar with settings, status, menu
│  ╚══════════════════════════════╝    │
│                                      │
│  ┌──────────────────────────────┐    │
│  │  Active Task: Setting up...  │    │ ← Task banner (collapsible)
│  │  Strategy: HTN │ Steps: 3/7  │    │
│  └──────────────────────────────┘    │
│                                      │
│  ┌──────────────────────────────┐    │
│  │        Chat Messages         │    │ ← Scrollable message list
│  │                              │    │
│  │  [User] Build me a REST API  │    │
│  │                              │    │
│  │  [Agent] 🧠 Analyzing...    │    │
│  │  ┌── Thinking ────────────┐ │    │ ← Expandable thought process
│  │  │ This requires:         │ │    │
│  │  │ 1. Project scaffold    │ │    │
│  │  │ 2. Route definitions   │ │    │
│  │  │ 3. Database setup      │ │    │
│  │  └────────────────────────┘ │    │
│  │                              │    │
│  │  [Agent] ⚡ Executing...    │    │
│  │  ┌── bash ─────────────────┐│    │ ← Tool execution card
│  │  │ $ mkdir project && cd.. ││    │
│  │  │ > Created project/      ││    │
│  │  │ ✓ Exit 0 (0.3s)       ││    │
│  │  └─────────────────────────┘│    │
│  │                              │    │
│  └──────────────────────────────┘    │
│                                      │
│  ┌──────────────────────────────┐    │
│  │ [📎] Type a message...  [▶] │    │ ← Input bar
│  └──────────────────────────────┘    │
└──────────────────────────────────────┘
```

#### Side Panels (Swipe/Tab)
- **Plan View**: Interactive DAG of current task decomposition
- **Memory View**: Browse working/episodic/semantic memories
- **Tools View**: Available tools with usage stats
- **Settings**: Model config, API keys, preferences

### 10.4 Animations & Micro-interactions

- **Thinking pulse**: Soft breathing glow animation on agent avatar during reasoning
- **Tool execution**: Progress bar with streaming output animation
- **Plan transitions**: Smooth node state changes (pending → running → done)
- **Message appearance**: Slide-up with fade, staggered for multi-part responses
- **Horizon switch**: Morphing animation showing strategy transition
- **Memory access**: Subtle flash when agent retrieves from memory

### 10.5 Responsive Design

The React app adapts to:
- **Phone portrait**: Full-width chat, side panels via bottom sheet
- **Phone landscape**: Split view (chat + panel)
- **Tablet**: Persistent side panel alongside chat
- **Desktop browser**: Full three-column layout (for development mode)

---

## 11. Project Structure

```
cortex/
├── plans.md                          # This document
├── README.md                         # Project overview & setup guide
│
├── client/                           # React application
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── main.tsx                  # Entry point
│   │   ├── App.tsx                   # Root component
│   │   │
│   │   ├── core/                     # Agent Core (Framework-agnostic)
│   │   │   ├── agent/
│   │   │   │   ├── CortexAgent.ts           # Main orchestrator
│   │   │   │   ├── types.ts                 # Core type definitions
│   │   │   │   └── constants.ts             # Configuration constants
│   │   │   │
│   │   │   ├── cognition/
│   │   │   │   ├── PerceptionEngine.ts      # Input parsing & classification
│   │   │   │   ├── ReasoningEngine.ts       # Multi-strategy reasoning
│   │   │   │   ├── PlanningEngine.ts        # HTN decomposition & DAG
│   │   │   │   ├── ReflectionEngine.ts      # Self-critique & learning
│   │   │   │   ├── CriticEngine.ts          # CRITIC verification
│   │   │   │   └── MetaCognition.ts         # Horizon & strategy management
│   │   │   │
│   │   │   ├── strategies/
│   │   │   │   ├── BaseStrategy.ts          # Abstract strategy
│   │   │   │   ├── ReactStrategy.ts         # ReAct loop
│   │   │   │   ├── HTNStrategy.ts           # Hierarchical task network
│   │   │   │   ├── LATSStrategy.ts          # Language Agent Tree Search
│   │   │   │   └── StrategySelector.ts      # Dynamic selection
│   │   │   │
│   │   │   ├── memory/
│   │   │   │   ├── MemoryManager.ts         # Unified memory interface
│   │   │   │   ├── WorkingMemory.ts         # Current context
│   │   │   │   ├── EpisodicMemory.ts        # Past task traces
│   │   │   │   ├── SemanticMemory.ts        # Facts & patterns
│   │   │   │   ├── ProceduralMemory.ts      # Compiled skills
│   │   │   │   ├── VectorStore.ts           # HNSW similarity search
│   │   │   │   └── db.ts                    # Dexie.js IndexedDB schema
│   │   │   │
│   │   │   ├── tools/
│   │   │   │   ├── ToolRegistry.ts          # Tool management
│   │   │   │   ├── BaseTool.ts              # Abstract tool class
│   │   │   │   ├── BashTool.ts              # Shell execution
│   │   │   │   ├── FileSystemTool.ts        # File operations
│   │   │   │   ├── HttpTool.ts              # HTTP requests
│   │   │   │   ├── CodeTool.ts              # Code generation/editing
│   │   │   │   ├── SearchTool.ts            # Web search
│   │   │   │   └── SystemTool.ts            # Device/system operations
│   │   │   │
│   │   │   └── llm/
│   │   │       ├── LLMProvider.ts           # Provider interface
│   │   │       ├── OpenAIProvider.ts         # OpenAI implementation
│   │   │       ├── AnthropicProvider.ts      # Anthropic implementation
│   │   │       ├── GoogleProvider.ts         # Gemini implementation
│   │   │       ├── OllamaProvider.ts         # Local model support
│   │   │       ├── ModelRouter.ts            # Intelligent model selection
│   │   │       └── PromptManager.ts          # Template & prompt engineering
│   │   │
│   │   ├── bridge/
│   │   │   ├── BridgeClient.ts              # Native bridge interface
│   │   │   ├── MockBridge.ts                # Browser dev mock
│   │   │   └── types.ts                     # Bridge protocol types
│   │   │
│   │   ├── ui/
│   │   │   ├── components/
│   │   │   │   ├── chat/
│   │   │   │   │   ├── ChatView.tsx         # Main chat container
│   │   │   │   │   ├── MessageBubble.tsx    # Message rendering
│   │   │   │   │   ├── ThinkingIndicator.tsx# Reasoning visualization
│   │   │   │   │   ├── ToolExecutionCard.tsx# Tool result display
│   │   │   │   │   ├── CodeBlock.tsx        # Syntax-highlighted code
│   │   │   │   │   ├── PlanCard.tsx         # Inline plan summary
│   │   │   │   │   └── InputBar.tsx         # Message input
│   │   │   │   │
│   │   │   │   ├── panels/
│   │   │   │   │   ├── PlanPanel.tsx        # Task plan DAG view
│   │   │   │   │   ├── MemoryPanel.tsx      # Memory browser
│   │   │   │   │   ├── ToolsPanel.tsx       # Available tools
│   │   │   │   │   └── SettingsPanel.tsx    # Configuration
│   │   │   │   │
│   │   │   │   └── common/
│   │   │   │       ├── AnimatedContainer.tsx # Animation wrapper
│   │   │   │       ├── GlassCard.tsx        # Glassmorphism card
│   │   │   │       ├── StatusBadge.tsx      # Status indicators
│   │   │   │       ├── ProgressRing.tsx     # Circular progress
│   │   │   │       └── Icon.tsx             # Icon system
│   │   │   │
│   │   │   ├── layouts/
│   │   │   │   ├── MainLayout.tsx           # App shell
│   │   │   │   ├── SplitLayout.tsx          # Chat + panel
│   │   │   │   └── BottomSheet.tsx          # Mobile panel container
│   │   │   │
│   │   │   ├── hooks/
│   │   │   │   ├── useAgent.ts              # Agent interaction hook
│   │   │   │   ├── useChat.ts               # Chat state management
│   │   │   │   ├── useTheme.ts              # Theme management
│   │   │   │   ├── useBridge.ts             # Bridge access hook
│   │   │   │   └── useMemory.ts             # Memory browsing hook
│   │   │   │
│   │   │   ├── stores/
│   │   │   │   ├── chatStore.ts             # Zustand chat state
│   │   │   │   ├── agentStore.ts            # Agent state
│   │   │   │   ├── settingsStore.ts         # App settings
│   │   │   │   └── themeStore.ts            # Theme state
│   │   │   │
│   │   │   └── theme/
│   │   │       ├── tokens.ts                # Design tokens
│   │   │       ├── animations.ts            # Animation definitions
│   │   │       └── global.css               # Global styles
│   │   │
│   │   └── utils/
│   │       ├── id.ts                        # UUID generation
│   │       ├── logger.ts                    # Structured logging
│   │       └── format.ts                    # Text/code formatting
│   │
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   └── postcss.config.js
│
├── android/                          # Android Host App
│   ├── app/
│   │   ├── src/main/
│   │   │   ├── kotlin/com/cortex/agent/
│   │   │   │   ├── MainActivity.kt          # Entry point
│   │   │   │   ├── CortexWebView.kt         # Custom WebView
│   │   │   │   ├── bridge/
│   │   │   │   │   ├── CortexBridge.kt      # Main JS interface
│   │   │   │   │   ├── ShellExecutor.kt     # Shell command execution
│   │   │   │   │   ├── FileSystemExecutor.kt# File operations
│   │   │   │   │   ├── HttpExecutor.kt      # HTTP client
│   │   │   │   │   └── SystemExecutor.kt    # System APIs
│   │   │   │   ├── service/
│   │   │   │   │   └── ExecutionService.kt  # Foreground service
│   │   │   │   └── security/
│   │   │   │       └── SecurityManager.kt   # Permission & sandboxing
│   │   │   ├── res/
│   │   │   │   ├── layout/
│   │   │   │   │   └── activity_main.xml
│   │   │   │   ├── values/
│   │   │   │   │   ├── strings.xml
│   │   │   │   │   ├── themes.xml
│   │   │   │   │   └── colors.xml
│   │   │   │   └── drawable/
│   │   │   │       └── ic_cortex.xml
│   │   │   ├── assets/
│   │   │   │   └── cortex/               # Built React app goes here
│   │   │   └── AndroidManifest.xml
│   │   └── build.gradle.kts
│   ├── build.gradle.kts
│   ├── settings.gradle.kts
│   └── gradle.properties
│
└── scripts/
    ├── build-android.sh              # Build React + copy to Android assets
    ├── dev.sh                        # Start React dev server
    └── deploy.sh                     # Build APK
```

---

## 12. Tech Stack

### Client (React App)

| Technology | Purpose | Version |
|-----------|---------|---------|
| **React** | UI framework | 19.x |
| **TypeScript** | Type safety | 5.x |
| **Vite** | Build tool | 6.x |
| **Zustand** | State management | 5.x |
| **Tailwind CSS** | Utility-first styling | 4.x |
| **Framer Motion** | Animations | 11.x |
| **Dexie.js** | IndexedDB wrapper | 4.x |
| **React Markdown** | Markdown rendering | 9.x |
| **Shiki** | Syntax highlighting | 1.x |
| **Lucide React** | Icons | Latest |

### Android Host

| Technology | Purpose | Version |
|-----------|---------|---------|
| **Kotlin** | Language | 2.0+ |
| **AndroidX** | Core libraries | Latest |
| **Coroutines** | Async execution | 1.8+ |
| **OkHttp** | HTTP client | 4.12+ |
| **Kotlinx Serialization** | JSON handling | 1.7+ |

### Development

| Tool | Purpose |
|------|---------|
| **pnpm** | Package management |
| **ESLint + Prettier** | Code quality |
| **Vitest** | Unit testing |
| **Playwright** | E2E testing |

---

## 13. Implementation Phases

### Phase 1: Foundation (Core Infrastructure)
**Estimated: 2-3 days**

1. **Project scaffolding**
   - Initialize React + TypeScript + Vite project
   - Configure Tailwind CSS, ESLint, Prettier
   - Set up project structure (all directories)

2. **Bridge layer**
   - Implement `BridgeClient` with native detection
   - Implement `MockBridge` for browser development
   - Define protocol types
   - Test bridge communication patterns

3. **Basic UI shell**
   - Main layout component
   - Theme system (dark/light, color tokens)
   - Basic chat interface (input + message list)
   - Message bubble component

4. **LLM integration (single provider)**
   - OpenAI provider implementation
   - Basic prompt management
   - Streaming response handling

### Phase 2: Agent Core (Cognitive Engine)
**Estimated: 3-4 days**

5. **Tool system**
   - `BaseTool` abstract class
   - `ToolRegistry` with schema generation
   - `BashTool` implementation (via bridge)
   - `FileSystemTool` implementation
   - `HttpTool` implementation

6. **ReAct strategy (System 1)**
   - ReAct loop implementation
   - Thought → Action → Observation cycle
   - Basic confidence tracking
   - Tool calling integration with LLM

7. **Memory system (working memory)**
   - IndexedDB schema (Dexie.js)
   - Working memory with rolling window
   - Context assembly for prompts

8. **Perception engine**
   - Input classification (question, command, task, conversation)
   - Intent extraction
   - Entity recognition (files, URLs, code)

### Phase 3: Advanced Reasoning
**Estimated: 3-4 days**

9. **HTN planning strategy (System 2)**
   - Task decomposition engine
   - DAG construction and validation
   - Dependency resolution
   - Parallel execution detection

10. **LATS strategy (Exploratory)**
    - MCTS implementation (UCB1 selection)
    - LLM-based node expansion
    - Reward estimation via LLM evaluation
    - Backpropagation and tree management

11. **Meta-cognition & dynamic horizon**
    - Complexity Oracle implementation
    - Strategy selector with scoring
    - Dynamic switching logic
    - Escalation and downgrade protocols

12. **Reflection engine**
    - Step-level reflection
    - Milestone reflection
    - Task-level reflection
    - Failure analysis

### Phase 4: Memory & Learning
**Estimated: 2-3 days**

13. **Episodic memory**
    - Task trace storage
    - Embedding-based retrieval
    - Similar task lookup for few-shot examples

14. **Semantic memory**
    - Fact extraction from reflections
    - Knowledge base with confidence scores
    - Auto-population from observations

15. **Procedural memory (skill library)**
    - Pattern recognition in successful traces
    - Procedure generalization
    - Trigger condition matching
    - Skill suggestion system

16. **Vector store**
    - In-memory HNSW implementation (or lightweight library)
    - Embedding generation (TF-IDF fallback, ONNX.js upgrade path)

### Phase 5: Rich UI
**Estimated: 3-4 days**

17. **Chat enhancements**
    - Thinking indicator with neural visualization
    - Tool execution cards (expandable, with streaming)
    - Code blocks with Shiki syntax highlighting
    - Markdown rendering for agent responses

18. **Plan visualization**
    - Interactive task DAG component
    - Node state animations
    - Progress tracking overlay
    - Expandable subtask details

19. **Side panels**
    - Memory browser panel
    - Tools panel with usage stats
    - Settings panel (API keys, model config, preferences)

20. **Animations & polish**
    - Message transitions (Framer Motion)
    - Thinking pulse animation
    - Horizon switch morphing effect
    - Haptic feedback integration (via bridge)

### Phase 6: Android App
**Estimated: 3-4 days**

21. **Android project setup**
    - Kotlin project with Gradle
    - WebView configuration
    - JS bridge registration

22. **Bridge implementation**
    - `ShellExecutor` with ProcessBuilder
    - `FileSystemExecutor`
    - `HttpExecutor` with OkHttp
    - `SystemExecutor` (notifications, clipboard, device info)

23. **Execution service**
    - Foreground service for long tasks
    - Wake lock management
    - Process death recovery

24. **Build pipeline**
    - Script to build React app → Android assets
    - APK build configuration
    - Signing configuration

### Phase 7: Polish & Advanced Features
**Estimated: 2-3 days**

25. **Multi-provider LLM support**
    - Anthropic, Google, Groq, Ollama providers
    - Model router implementation
    - Cost tracking

26. **Critic system**
    - Tool-interactive verification
    - Output validation
    - Iterative refinement

27. **Advanced tools**
    - Web search integration
    - Code editing tool (structured patches)
    - Python executor (runtime detection)

28. **Security hardening**
    - Permission system for destructive operations
    - Working directory sandboxing
    - API key secure storage
    - Audit logging

---

## 14. Security Model

### 14.1 Permission Levels

```typescript
enum PermissionLevel {
  SAFE = 'safe',           // Read operations, info queries
  MODERATE = 'moderate',   // Write to approved directories
  DANGEROUS = 'dangerous', // System commands, delete operations
  CRITICAL = 'critical',   // Root operations, system modification
}
```

### 14.2 Approval Gates

```typescript
interface ApprovalGate {
  // Operations that always require user approval
  alwaysApprove: [
    'rm -rf',             // Recursive delete
    'chmod',              // Permission changes
    'kill',               // Process termination
    'reboot',             // System reboot
    'dd',                 // Disk operations
    'mkfs',               // Filesystem creation
    '> /dev/',            // Device writes
  ];
  
  // Operations that require approval on first use, then remember
  approveOnce: [
    'pip install',        // Package installation
    'apt install',        // System packages
    'npm install',        // Node packages
    'curl | sh',          // Remote script execution
  ];
  
  // Auto-approved operations
  autoApprove: [
    'ls', 'cat', 'echo',  // Read/display
    'mkdir', 'touch',      // Create
    'grep', 'find',        // Search
    'pwd', 'whoami',       // Info
  ];
}
```

### 14.3 API Key Security

- API keys stored in Android's EncryptedSharedPreferences
- Never exposed to the WebView's JavaScript context directly
- Bridge provides `callLLM(messages)` method that injects keys server-side
- Alternatively, keys can be stored in WebView's IndexedDB (less secure, but works for dev)

### 14.4 Sandboxing

- Default working directory: app's private storage
- User can whitelist additional directories
- Path traversal prevention (resolve all paths, reject `..` outside sandbox)
- Process isolation via Android's app sandbox

---

## 15. Testing Strategy

### 15.1 Unit Tests (Vitest)

- All cognitive engine components
- Memory system CRUD operations
- Tool execution with mock bridge
- LLM prompt generation
- Vector store operations
- Strategy selection logic

### 15.2 Integration Tests

- End-to-end ReAct loop with mock LLM
- HTN planning + execution with mock tools
- LATS tree search with mock evaluator
- Memory retrieval and ranking
- Bridge protocol communication

### 15.3 UI Tests (Playwright / Testing Library)

- Chat message rendering
- Tool execution card expansion
- Plan visualization interactions
- Settings panel functionality
- Theme switching

### 15.4 Manual Testing Scenarios

- "Create a Node.js REST API" (medium horizon)
- "What's the weather?" (short horizon, needs web search)
- "Build and deploy a full-stack app" (long horizon, LATS)
- "Fix this bug" (reactive, with code tool)
- "Set up my development environment" (medium, multi-tool)

---

## Appendix A: Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| State management | Zustand over Redux | Simpler, less boilerplate, good TypeScript support |
| Styling | Tailwind over CSS-in-JS | Performance, no runtime overhead, great DX |
| Animation | Framer Motion | Best React animation library, physics-based |
| Database | IndexedDB (Dexie) | Browser-native, no server needed, large storage |
| Vector search | Custom HNSW | Avoid heavy ML dependencies, small footprint |
| Icons | Lucide | Tree-shakeable, consistent, React-native |
| Build tool | Vite | Fast HMR, good Android WebView support |
| Android language | Kotlin | Modern, null-safe, coroutine support |

## Appendix B: Future Enhancements

- **Multi-agent**: Spawn sub-agents for parallel subtask execution
- **Vision**: Camera/screenshot analysis via multimodal LLM
- **Voice**: Speech-to-text input, text-to-speech output
- **Plugins**: User-installable tool plugins
- **Collaboration**: Share agent sessions between devices
- **Fine-tuning**: On-device model distillation from successful traces
- **Offline mode**: Local LLM fallback (Gemma, Phi via WebGPU)
