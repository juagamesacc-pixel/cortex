import React from 'react';
import { Icon } from '../common/Icon';
import { useAgentStore } from '../../stores/agentStore';
import { StatusBadge } from '../common/StatusBadge';

export interface ThinkingIndicatorProps {
  thoughtText?: string;
}

export const ThinkingIndicator: React.FC<ThinkingIndicatorProps> = ({ thoughtText }) => {
  const { mode, horizon, strategy, horizonSwitchNotice } = useAgentStore();

  return (
    <div className="flex flex-col space-y-2 my-2 p-3.5 rounded-2xl bg-[#211F26]/90 border border-purple-500/20 glow-thinking">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-300 flex items-center justify-center animate-pulse">
            <Icon name="brain" size={14} />
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-purple-300">
            Cognitive State: {mode}
          </span>
        </div>
        <div className="flex items-center space-x-1.5">
          <StatusBadge type="horizon" value={horizon} />
          <StatusBadge type="strategy" value={strategy} />
        </div>
      </div>

      {horizonSwitchNotice && (
        <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200">
          <span className="font-semibold">⚡ Dynamic Horizon Switch:</span> {horizonSwitchNotice.from} → {horizonSwitchNotice.to}
          <div className="text-[11px] opacity-80 mt-0.5">{horizonSwitchNotice.reason}</div>
        </div>
      )}

      {thoughtText && (
        <div className="text-xs text-white/70 italic bg-black/20 p-2 rounded-lg">
          "{thoughtText}"
        </div>
      )}
    </div>
  );
};
