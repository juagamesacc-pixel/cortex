import { create } from 'zustand';

export interface AppSettings {
  apiKey: string;
  apiBaseUrl: string;
  selectedModel: string;
  autoApproveSafeCommands: boolean;
  activePanel: 'none' | 'plan' | 'memory' | 'tools' | 'settings';
}

interface SettingsState extends AppSettings {
  setApiKey: (key: string) => void;
  setApiBaseUrl: (url: string) => void;
  setSelectedModel: (model: string) => void;
  setAutoApproveSafeCommands: (auto: boolean) => void;
  setActivePanel: (panel: AppSettings['activePanel']) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  apiKey: typeof localStorage !== 'undefined' ? localStorage.getItem('cortex_api_key') || '' : '',
  apiBaseUrl: typeof localStorage !== 'undefined' ? localStorage.getItem('cortex_api_url') || 'https://api.openai.com/v1' : 'https://api.openai.com/v1',
  selectedModel: typeof localStorage !== 'undefined' ? localStorage.getItem('cortex_model') || 'gpt-4o' : 'gpt-4o',
  autoApproveSafeCommands: true,
  activePanel: 'none',

  setApiKey: (apiKey) => {
    if (typeof localStorage !== 'undefined') localStorage.setItem('cortex_api_key', apiKey);
    set({ apiKey });
  },
  setApiBaseUrl: (apiBaseUrl) => {
    if (typeof localStorage !== 'undefined') localStorage.setItem('cortex_api_url', apiBaseUrl);
    set({ apiBaseUrl });
  },
  setSelectedModel: (selectedModel) => {
    if (typeof localStorage !== 'undefined') localStorage.setItem('cortex_model', selectedModel);
    set({ selectedModel });
  },
  setAutoApproveSafeCommands: (autoApproveSafeCommands) => set({ autoApproveSafeCommands }),
  setActivePanel: (activePanel) => set({ activePanel }),
}));
