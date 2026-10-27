import React from 'react';
import { useSettingsStore } from '../../stores/settingsStore';
import { Icon } from '../common/Icon';

export interface SettingsPanelProps {
  onClose: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ onClose }) => {
  const {
    apiKey,
    setApiKey,
    apiBaseUrl,
    setApiBaseUrl,
    selectedModel,
    setSelectedModel,
    autoApproveSafeCommands,
    setAutoApproveSafeCommands,
  } = useSettingsStore();

  return (
    <div className="flex flex-col h-full overflow-hidden text-sm">
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center space-x-2">
          <Icon name="settings" className="text-purple-400" size={18} />
          <h2 className="font-bold text-white">Cortex Configuration</h2>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-full hover:bg-white/10 text-white/60 hover:text-white"
        >
          <Icon name="close" size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-white/70 mb-1">
            API Key (OpenAI / OpenRouter / Groq)
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-..."
            className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-white/30 outline-none focus:border-purple-400/50"
          />
          <span className="text-[10px] text-white/40 mt-1 block">
            If left blank, Cortex operates with its built-in simulated neural runtime.
          </span>
        </div>

        <div>
          <label className="block text-xs font-semibold text-white/70 mb-1">
            Base Endpoint URL
          </label>
          <input
            type="text"
            value={apiBaseUrl}
            onChange={(e) => setApiBaseUrl(e.target.value)}
            placeholder="https://api.openai.com/v1"
            className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-white/30 outline-none focus:border-purple-400/50"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-white/70 mb-1">
            Model Selection
          </label>
          <input
            type="text"
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            placeholder="gpt-4o"
            className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-white/30 outline-none focus:border-purple-400/50"
          />
        </div>

        <div className="pt-2 border-t border-white/10">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoApproveSafeCommands}
              onChange={(e) => setAutoApproveSafeCommands(e.target.checked)}
              className="rounded bg-black/40 border-white/20 text-purple-600 focus:ring-0"
            />
            <span className="text-xs text-white/80">Auto-approve safe commands (ls, cat, pwd)</span>
          </label>
        </div>
      </div>
    </div>
  );
};
