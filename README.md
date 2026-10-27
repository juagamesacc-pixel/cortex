# Cortex — Adaptive Cognitive AI Agent for Android

> An edge-tier autonomous AI agent platform combining dual-process cognitive architecture (System 1 reactive ReAct, System 2 HTN planning, and LATS Monte Carlo Tree Search) with a native Android execution bridge.

---

## Key Highlights

- **Dynamic Horizon Switching**: Automatically classifies tasks as short, medium, or long horizon. Dynamically escalates or downgrades reasoning strategies at runtime based on confidence and execution feedback.
- **Pure React Cognitive Core**: 100% of reasoning, memory consolidation, vector indexing, planning, reflection, and UI rendering runs directly in JavaScript/TypeScript inside an Android WebView or modern browser.
- **Tiered Android Native Bridge**:
  - **Tier 1 (Shell Executor)**: Native `ProcessBuilder` executing bash/sh commands with real-time asynchronous streaming back into the React UI.
  - **Tier 2 (Structured I/O)**: High-speed file CRUD and OkHttp networking without shell overhead.
  - **Tier 3 (Runtime Detection)**: Detects installed host runtimes (`python3`, `node`, `ruby`, `git`) dynamically.
  - **Tier 4 (System APIs)**: Battery, memory, notifications, clipboard, and foreground wake locks.
- **Material You Aesthetic UI**: Fluid Android-first design system with cognitive pulse indicators, expandable tool execution logs, interactive DAG visualization, and bottom sheets.
- **Comprehensive Memory Architecture**:
  - **Working Memory**: Rolling context window and scratchpad notes.
  - **Episodic Memory**: Task trajectories with vector similarity search for few-shot learning.
  - **Semantic Memory**: Knowledge facts with confidence scoring and decay.
  - **Procedural Memory**: Reusable compiled skills discovered from successful execution traces.

---

## Directory Structure

```text
cortex/
├── plans.md                  # Comprehensive architectural blueprint & rulebook
├── README.md                 # This overview guide
│
├── client/                   # React 19 + TypeScript + Vite + Tailwind CSS
│   ├── src/
│   │   ├── core/
│   │   │   ├── agent/        # Master orchestrator (CortexAgent.ts) & types
│   │   │   ├── cognition/    # Perception, MetaCognition, Planning, Reflection, Critic
│   │   │   ├── strategies/   # ReactStrategy, HTNStrategy, LATSStrategy, Selector
│   │   │   ├── memory/       # IndexedDB (Dexie), VectorStore, 4-tier memory
│   │   │   ├── tools/        # BashTool, FileSystemTool, HttpTool, CodeTool, SystemTool
│   │   │   └── llm/          # OpenAIProvider, ModelRouter, PromptManager
│   │   ├── bridge/           # BridgeClient & MockBridge fallback for browser dev
│   │   ├── ui/               # Material You UI components, chat, DAG viewer, panels
│   │   └── App.tsx           # Main app shell
│   └── package.json
│
├── android/                  # Native Android Host App (Kotlin)
│   ├── app/src/main/kotlin/com/cortex/agent/
│   │   ├── MainActivity.kt   # Edge-to-edge window hosting CortexWebView
│   │   ├── CortexWebView.kt  # Custom WebView with hardware acceleration
│   │   ├── bridge/           # CortexBridge, ShellExecutor, FileSystemExecutor, etc.
│   │   ├── service/          # ExecutionService (Foreground CPU wake lock)
│   │   └── security/         # SecurityManager sandboxing
│   └── build.gradle.kts
│
└── scripts/
    ├── dev.sh                # Launch React development preview
    ├── build-android.sh      # Build React bundle into Android assets
    └── deploy.sh             # Assemble debug APK
```

---

## How Dynamic Horizon Switching Works

1. **Complexity Oracle (`MetaCognition.ts`)**: Evaluates incoming goals across 6 metrics (subtask estimate, dependency depth, ambiguity, novelty, tool diversity, memory similarity) and calculates a normalized score (0..1).
   - `score < 0.35` ➔ **Short Horizon** (ReAct Strategy)
   - `0.35 ≤ score < 0.68` ➔ **Medium Horizon** (HTN Planning Strategy)
   - `score ≥ 0.68` ➔ **Long Horizon** (LATS Tree Search Strategy)
2. **Runtime Monitoring**: During execution, the agent evaluates confidence streaks and tool failure rates:
   - If ReAct encounters consecutive low confidence or errors, it **escalates dynamically to HTN**.
   - If HTN encounters repeated subtask failure, it **escalates dynamically to LATS**.
   - When only trivial terminal subtasks remain, HTN **downgrades to high-speed ReAct**.

---

## Getting Started

### 1. Web Preview & Development Mode

Cortex includes a `MockBridge` that simulates the Android environment in standard web browsers:

```bash
cd cortex/client
pnpm install
pnpm run dev
```

### 2. Building for Android

Compile the client bundle and sync it to Android WebView assets:

```bash
bash cortex/scripts/build-android.sh
```

Then open `cortex/android` in Android Studio or compile with Gradle to build your APK.

---

## 🔄 Unified GitHub Actions CI/CD Workflow

The repository includes a single unified workflow in [`.github/workflows/build.yml`](file:///.github/workflows/build.yml) that:
1. Installs Node.js & `pnpm` and compiles the React webapp bundle (`client/dist`).
2. Archives and uploads the standalone webapp as a downloadable artifact.
3. Automatically synchronizes the compiled bundle directly into the Android host's assets (`android/app/src/main/assets/cortex`).
4. Bootstraps JDK 17, Gradle, and Android SDK.
5. Assembles both Debug and signed/unsigned Release APKs.
6. Publishes the APK artifacts and outputs a detailed execution report to GitHub Step Summary.

