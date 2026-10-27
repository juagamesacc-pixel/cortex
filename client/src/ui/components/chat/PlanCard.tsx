import React from 'react';
import { TaskPlan } from '../../../core/agent/types';
import { Icon } from '../common/Icon';
import clsx from 'clsx';

export interface PlanCardProps {
  plan: TaskPlan;
  onOpenPlanPanel?: () => void;
}

export const PlanCard: React.FC<PlanCardProps> = ({ plan, onOpenPlanPanel }) => {
  const nodes = Object.values(plan.nodes);
  const completed = nodes.filter((n) => n.status === 'completed').length;
  const progressPercent = Math.round((completed / nodes.length) * 100) || 0;

  return (
    <div className="my-2 p-3 rounded-2xl bg-gradient-to-r from-purple-950/40 to-indigo-950/40 border border-purple-500/30">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <Icon name="git" className="text-purple-400" size={16} />
          <span className="text-xs font-bold uppercase tracking-wider text-purple-300">
            HTN Task Plan ({completed}/{nodes.length} Completed)
          </span>
        </div>
        {onOpenPlanPanel && (
          <button
            onClick={onOpenPlanPanel}
            className="text-[11px] text-purple-300 hover:text-white underline cursor-pointer"
          >
            Open DAG View
          </button>
        )}
      </div>

      <div className="w-full bg-black/40 h-1.5 rounded-full overflow-hidden mb-3">
        <div
          className="bg-purple-500 h-full transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="space-y-1.5 max-h-36 overflow-y-auto">
        {nodes.map((node) => (
          <div
            key={node.id}
            className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-black/20 text-xs"
          >
            <div className="flex items-center space-x-2">
              <span
                className={clsx(
                  'w-2 h-2 rounded-full',
                  node.status === 'completed'
                    ? 'bg-emerald-400'
                    : node.status === 'running'
                    ? 'bg-amber-400 animate-ping'
                    : node.status === 'failed'
                    ? 'bg-rose-400'
                    : 'bg-white/20'
                )}
              />
              <span className="font-medium text-white/90">{node.title}</span>
            </div>
            <span className="text-[10px] text-white/40 uppercase">{node.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
