import React, { useState, useEffect } from 'react';
import { toolRegistry } from '../../../core/tools/ToolRegistry';
import { useBridge } from '../../hooks/useBridge';
import { Icon } from '../common/Icon';

export interface ToolsPanelProps {
  onClose: () => void;
}

export const ToolsPanel: React.FC<ToolsPanelProps> = ({ onClose }) => {
  const { deviceInfo, runtimes, isNative } = useBridge();
  const tools = toolRegistry.getAll();
  const stats = toolRegistry.getAllStats();

  return (
    <div className="flex flex-col h-full overflow-hidden text-sm">
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center space-x-2">
          <Icon name="cpu" className="text-purple-400" size={18} />
          <h2 className="font-bold text-white">Bridge & Tool Registry</h2>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-full hover:bg-white/10 text-white/60 hover:text-white"
        >
          <Icon name="close" size={18} />
        </button>
      </div>

      <div className="p-4 bg-black/20 border-b border-white/5 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-white/60">Execution Host:</span>
          <span className="text-xs font-semibold text-emerald-400">
            {isNative ? 'Android Native Host' : 'Web Virtual Fallback'}
          </span>
        </div>
        {deviceInfo && (
          <div className="text-[11px] text-white/50 space-y-0.5">
            <div>Device: {deviceInfo.manufacturer} {deviceInfo.model}</div>
            <div>Android: {deviceInfo.androidVersion} (SDK {deviceInfo.sdkInt})</div>
            <div>Battery: {deviceInfo.batteryLevelPercent}% {deviceInfo.isCharging ? '⚡ Charging' : ''}</div>
          </div>
        )}
        <div className="flex flex-wrap gap-1 mt-1">
          {runtimes.map((rt) => (
            <span key={rt} className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-purple-300">
              {rt}
            </span>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <div className="text-[10px] font-bold text-white/40 uppercase tracking-wider">
          Registered Capabilities ({tools.length})
        </div>

        {tools.map((tool) => {
          const s = stats[tool.name];
          return (
            <div key={tool.name} className="p-3 rounded-xl bg-black/30 border border-white/5 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-xs text-indigo-300">{tool.name}</span>
                {s && (
                  <span className="text-[10px] text-white/40">
                    Calls: {s.callCount} • Success: {s.successCount}
                  </span>
                )}
              </div>
              <div className="text-xs text-white/70">{tool.description}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
