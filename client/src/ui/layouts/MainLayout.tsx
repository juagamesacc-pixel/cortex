import React from 'react';
import { useAgentStore } from '../stores/agentStore';
import { useSettingsStore } from '../stores/settingsStore';
import { useBridge } from '../hooks/useBridge';
import { StatusBadge } from '../components/common/StatusBadge';
import { Icon } from '../components/common/Icon';
import { BottomSheet } from './BottomSheet';
import { PlanPanel } from '../components/panels/PlanPanel';
import { MemoryPanel } from '../components/panels/MemoryPanel';
import { ToolsPanel } from '../components/panels/ToolsPanel';
import { SettingsPanel } from '../components/panels/SettingsPanel';

export interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const { horizon, strategy, mode } = useAgentStore();
  const { activePanel, setActivePanel } = useSettingsStore();
  const { isNative } = useBridge();

  return (
    <div className="flex flex-col h-screen w-screen bg-[#141218] text-[#E6E1E5] overflow-hidden">
      {/* Android Top App Bar */}
      <header className="flex items-center justify-between px-4 py-3 bg-[#1C1B1F]/90 backdrop-blur-md border-b border-white/5 select-none z-20">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center shadow-md">
            <Icon name="brain" size={18} className="text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-sm tracking-wide text-white">CORTEX</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300">
                {isNative ? 'ANDROID HOST' : 'PREVIEW'}
              </span>
            </div>
            <div className="flex items-center space-x-1 mt-0.5">
              <StatusBadge type="horizon" value={horizon} />
              <StatusBadge type="strategy" value={strategy} />
            </div>
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setActivePanel('plan')}
            className="p-2 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors"
            title="HTN Plan View"
          >
            <Icon name="git" size={18} />
          </button>
          <button
            onClick={() => setActivePanel('memory')}
            className="p-2 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors"
            title="Memory Store"
          >
            <Icon name="database" size={18} />
          </button>
          <button
            onClick={() => setActivePanel('tools')}
            className="p-2 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors"
            title="Tools & Runtimes"
          >
            <Icon name="cpu" size={18} />
          </button>
          <button
            onClick={() => setActivePanel('settings')}
            className="p-2 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors"
            title="Settings"
          >
            <Icon name="settings" size={18} />
          </button>
        </div>
      </header>

      {/* Main chat & execution container */}
      <main className="flex-1 overflow-hidden flex flex-col">{children}</main>

      {/* Bottom Sheet for Modals/Panels */}
      <BottomSheet isOpen={activePanel !== 'none'} onClose={() => setActivePanel('none')}>
        {activePanel === 'plan' && <PlanPanel onClose={() => setActivePanel('none')} />}
        {activePanel === 'memory' && <MemoryPanel onClose={() => setActivePanel('none')} />}
        {activePanel === 'tools' && <ToolsPanel onClose={() => setActivePanel('none')} />}
        {activePanel === 'settings' && <SettingsPanel onClose={() => setActivePanel('none')} />}
      </BottomSheet>
    </div>
  );
};
