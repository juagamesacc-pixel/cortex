import React, { useState, useEffect } from 'react';
import { memoryManager } from '../../../core/memory/MemoryManager';
import { DBEpisode, DBSemanticFact, DBProcedure } from '../../../core/memory/db';
import { Icon } from '../common/Icon';
import clsx from 'clsx';

export interface MemoryPanelProps {
  onClose: () => void;
}

export const MemoryPanel: React.FC<MemoryPanelProps> = ({ onClose }) => {
  const [tab, setTab] = useState<'episodes' | 'facts' | 'procedures'>('episodes');
  const [episodes, setEpisodes] = useState<DBEpisode[]>([]);
  const [facts, setFacts] = useState<DBSemanticFact[]>([]);
  const [procedures, setProcedures] = useState<DBProcedure[]>([]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      await memoryManager.initialize();
      const [eps, fts, procs] = await Promise.all([
        memoryManager.episodic.getAllEpisodes(),
        memoryManager.semantic.getAllFacts(),
        memoryManager.procedural.getAllProcedures(),
      ]);
      if (mounted) {
        setEpisodes(eps);
        setFacts(fts);
        setProcedures(procs);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="flex flex-col h-full overflow-hidden text-sm">
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center space-x-2">
          <Icon name="database" className="text-purple-400" size={18} />
          <h2 className="font-bold text-white">Cognitive Memory Store</h2>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-full hover:bg-white/10 text-white/60 hover:text-white"
        >
          <Icon name="close" size={18} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10 bg-black/20">
        <button
          onClick={() => setTab('episodes')}
          className={clsx(
            'flex-1 py-2.5 text-xs font-semibold uppercase tracking-wider text-center border-b-2 transition-all',
            tab === 'episodes'
              ? 'border-purple-400 text-purple-300 bg-white/5'
              : 'border-transparent text-white/50 hover:text-white'
          )}
        >
          Episodic ({episodes.length})
        </button>
        <button
          onClick={() => setTab('facts')}
          className={clsx(
            'flex-1 py-2.5 text-xs font-semibold uppercase tracking-wider text-center border-b-2 transition-all',
            tab === 'facts'
              ? 'border-purple-400 text-purple-300 bg-white/5'
              : 'border-transparent text-white/50 hover:text-white'
          )}
        >
          Semantic ({facts.length})
        </button>
        <button
          onClick={() => setTab('procedures')}
          className={clsx(
            'flex-1 py-2.5 text-xs font-semibold uppercase tracking-wider text-center border-b-2 transition-all',
            tab === 'procedures'
              ? 'border-purple-400 text-purple-300 bg-white/5'
              : 'border-transparent text-white/50 hover:text-white'
          )}
        >
          Skills ({procedures.length})
        </button>
      </div>

      {/* Content list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
        {tab === 'episodes' && (
          <>
            {episodes.length === 0 ? (
              <div className="text-center py-8 text-white/40">No episodes recorded yet.</div>
            ) : (
              episodes.map((ep) => (
                <div key={ep.id} className="p-3 rounded-xl bg-black/30 border border-white/5 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-white truncate max-w-[200px]">
                      {ep.taskDescription}
                    </span>
                    <span className="text-[10px] text-emerald-400 uppercase font-bold">{ep.outcome}</span>
                  </div>
                  <div className="text-xs text-white/50">
                    Strategy: {ep.strategy.toUpperCase()} • Steps: {ep.totalSteps} • {(ep.totalDurationMs / 1000).toFixed(1)}s
                  </div>
                  {ep.lessonsLearned.length > 0 && (
                    <div className="text-[11px] text-purple-300/80 bg-purple-950/20 p-1.5 rounded mt-1">
                      💡 {ep.lessonsLearned[0]}
                    </div>
                  )}
                </div>
              ))
            )}
          </>
        )}

        {tab === 'facts' && (
          <>
            {facts.length === 0 ? (
              <div className="text-center py-8 text-white/40">No semantic facts stored yet.</div>
            ) : (
              facts.map((fact) => (
                <div key={fact.id} className="p-3 rounded-xl bg-black/30 border border-white/5 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-purple-400 uppercase font-bold">{fact.domain}</span>
                    <span className="text-[10px] text-white/40">Confidence: {Math.round(fact.confidence * 100)}%</span>
                  </div>
                  <div className="text-xs text-white/90">{fact.content}</div>
                </div>
              ))
            )}
          </>
        )}

        {tab === 'procedures' && (
          <>
            {procedures.length === 0 ? (
              <div className="text-center py-8 text-white/40">No compiled procedural skills.</div>
            ) : (
              procedures.map((p) => (
                <div key={p.id} className="p-3 rounded-xl bg-black/30 border border-white/5 space-y-1">
                  <div className="font-semibold text-xs text-white">{p.name}</div>
                  <div className="text-xs text-white/60">{p.description}</div>
                  <div className="text-[10px] text-indigo-400 font-mono">
                    Keywords: {p.triggerKeywords.join(', ')}
                  </div>
                </div>
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
};
