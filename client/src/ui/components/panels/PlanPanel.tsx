import React from 'react';
import { useChatStore } from '../../stores/chatStore';
import { Icon } from '../common/Icon';
import clsx from 'clsx';

export interface PlanPanelProps {
  onClose: () => void;
}

export const PlanPanel: React.FC<PlanPanelProps> = ({ onClose }) => {
  const { currentPlan } = useChatStore();

  if (!currentPlan) {
    return (
      <div className="p-6 text-center text-white/50">
        <Icon name="git" size={32} className="mx-auto mb-2 opacity-40" />
        <div className="font-semibold text-sm">No Active HTN Plan</div>
        <div className="text-xs mt-1">Submit a medium or long-horizon goal to generate a DAG plan.</div>
      </div>
    );
  }

  const nodes = Object.values(currentPlan.nodes);
  const criticalSet = new Set(currentPlan.criticalPath);

  return (
    <div className="flex flex-col h-full overflow-hidden text-sm">
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center space-x-2">
          <Icon name="git" className="text-purple-400" size={18} />
          <h2 className="font-bold text-white">HTN Task Graph (DAG)</h2>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-full hover:bg-white/10 text-white/60 hover:text-white"
        >
          <Icon name="close" size={18} />
        </button>
      </div>

      <div className="p-4 bg-purple-950/20 border-b border-white/5">
        <div className="text-[11px] font-bold text-purple-400 uppercase tracking-wider">Goal</div>
        <div className="text-xs text-white/90 font-medium mt-0.5">{currentPlan.goal}</div>
        <div className="text-[11px] text-white/40 mt-1">
          Parallel Batches: {currentPlan.parallelBatches.length} • Total Subtasks: {nodes.length}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {currentPlan.parallelBatches.map((batch, batchIdx) => (
          <div key={batchIdx} className="space-y-2">
            <div className="text-[10px] font-bold text-white/40 uppercase tracking-wider">
              Batch {batchIdx + 1} ({batch.length} {batch.length === 1 ? 'task' : 'parallel tasks'})
            </div>

            <div className="space-y-2">
              {batch.map((nodeId) => {
                const node = currentPlan.nodes[nodeId];
                if (!node) return null;
                const isCritical = criticalSet.has(nodeId);

                return (
                  <div
                    key={node.id}
                    className={clsx(
                      'p-3 rounded-xl border transition-all',
                      node.status === 'completed'
                        ? 'bg-emerald-950/20 border-emerald-500/30'
                        : node.status === 'running'
                        ? 'bg-amber-950/20 border-amber-500/40 animate-pulse'
                        : 'bg-black/30 border-white/5',
                      isCritical && 'ring-1 ring-purple-500/40'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-white flex items-center space-x-1.5">
                        {isCritical && (
                          <span className="text-[9px] bg-purple-500/30 text-purple-300 px-1 py-0.5 rounded uppercase font-bold">
                            Critical Path
                          </span>
                        )}
                        <span>{node.title}</span>
                      </span>
                      <span
                        className={clsx(
                          'text-[10px] font-bold uppercase px-1.5 py-0.5 rounded',
                          node.status === 'completed'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : node.status === 'running'
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-white/10 text-white/40'
                        )}
                      >
                        {node.status}
                      </span>
                    </div>

                    <div className="text-xs text-white/60 mt-1">{node.description}</div>

                    {node.tool && (
                      <div className="mt-2 text-[11px] font-mono text-indigo-300 bg-white/5 px-2 py-1 rounded inline-block">
                        ⚡ tool: {node.tool}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
