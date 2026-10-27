import { create } from 'zustand';
import { ReActStep, TaskPlan, ToolExecutionResult } from '../../core/agent/types';

export interface ChatMessageItem {
  id: string;
  sender: 'user' | 'agent' | 'system';
  content: string;
  timestamp: number;
  steps?: ReActStep[];
  plan?: TaskPlan;
  durationMs?: number;
  toolResults?: ToolExecutionResult[];
}

interface ChatState {
  messages: ChatMessageItem[];
  activeStreamingThought: string;
  activeStreamingToolChunk: string;
  activeToolName: string | null;
  currentPlan: TaskPlan | null;

  addMessage: (msg: Omit<ChatMessageItem, 'id' | 'timestamp'>) => string;
  updateMessage: (id: string, updates: Partial<ChatMessageItem>) => void;
  setStreamingThought: (thought: string) => void;
  setStreamingToolChunk: (chunk: string, toolName?: string) => void;
  setCurrentPlan: (plan: TaskPlan | null) => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [
    {
      id: 'welcome_1',
      sender: 'agent',
      content:
        'Hello! I am Cortex, your adaptive cognitive agent for Android. I can dynamically handle short and long horizon tasks, execute shell commands natively, operate on files, and learn from past trajectories. How can I assist you?',
      timestamp: Date.now(),
    },
  ],
  activeStreamingThought: '',
  activeStreamingToolChunk: '',
  activeToolName: null,
  currentPlan: null,

  addMessage: (msg) => {
    const id = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const fullMsg: ChatMessageItem = {
      ...msg,
      id,
      timestamp: Date.now(),
    };
    set((state) => ({ messages: [...state.messages, fullMsg] }));
    return id;
  },

  updateMessage: (id, updates) => {
    set((state) => ({
      messages: state.messages.map((m) => (m.id === id ? { ...m, ...updates } : m)),
    }));
  },

  setStreamingThought: (thought) => {
    set({ activeStreamingThought: thought });
  },

  setStreamingToolChunk: (chunk, toolName) => {
    set((state) => ({
      activeStreamingToolChunk: chunk ? state.activeStreamingToolChunk + chunk : '',
      activeToolName: toolName !== undefined ? toolName : state.activeToolName,
    }));
  },

  setCurrentPlan: (plan) => {
    set({ currentPlan: plan });
  },

  clearMessages: () => {
    set({ messages: [] });
  },
}));
