import { create } from 'zustand';
import { ComplexityAssessment, HorizonType, StrategyType } from '../../core/agent/types';

export type AgentStateMode =
  | 'idle'
  | 'perceiving'
  | 'assessing'
  | 'thinking'
  | 'executing_tool'
  | 'reflecting'
  | 'critic_pass'
  | 'error';

interface AgentStoreState {
  mode: AgentStateMode;
  horizon: HorizonType;
  strategy: StrategyType;
  latestAssessment: ComplexityAssessment | null;
  activeToolCallName: string | null;
  horizonSwitchNotice: {
    from: string;
    to: string;
    reason: string;
  } | null;

  setMode: (mode: AgentStateMode) => void;
  setHorizonAndStrategy: (horizon: HorizonType, strategy: StrategyType) => void;
  setLatestAssessment: (assessment: ComplexityAssessment | null) => void;
  setActiveToolCallName: (name: string | null) => void;
  setHorizonSwitchNotice: (notice: AgentStoreState['horizonSwitchNotice']) => void;
  reset: () => void;
}

export const useAgentStore = create<AgentStoreState>((set) => ({
  mode: 'idle',
  horizon: 'short',
  strategy: 'react',
  latestAssessment: null,
  activeToolCallName: null,
  horizonSwitchNotice: null,

  setMode: (mode) => set({ mode }),
  setHorizonAndStrategy: (horizon, strategy) => set({ horizon, strategy }),
  setLatestAssessment: (latestAssessment) => set({ latestAssessment }),
  setActiveToolCallName: (activeToolCallName) => set({ activeToolCallName }),
  setHorizonSwitchNotice: (horizonSwitchNotice) => set({ horizonSwitchNotice }),
  reset: () =>
    set({
      mode: 'idle',
      activeToolCallName: null,
      horizonSwitchNotice: null,
    }),
}));
