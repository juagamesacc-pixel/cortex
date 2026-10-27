import React, { useState } from 'react';
import { Icon } from '../common/Icon';
import clsx from 'clsx';
import { ToolCall } from '../../../core/agent/types';

export interface ToolExecutionCardProps {
  toolCall?: ToolCall;
  toolName?: string;
  args?: Record<string, any>;
  output?: string;
  isStreaming?: boolean;
  success?: boolean;
}

export const ToolExecutionCard: React.FC<ToolExecutionCardProps> = ({
  toolCall,
  toolName = toolCall?.tool || 'tool',
  args = toolCall?.args || {},
  output = '',
  isStreaming = false,
  success = true,
}) => {
  const [expanded, setExpanded] = useState(isStreaming);

  return (
    <div className="my-2 rounded-xl overflow-hidden border border-white/10 bg-[#1A1820] text-sm">
      <div
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between px-3 py-2 bg-white/5 cursor-pointer hover:bg-white/10 transition-colors"
      >
        <div className="flex items-center space-x-2">
          <span className="p-1 rounded bg-indigo-500/20 text-indigo-400">
            <Icon name={toolName === 'bash' ? 'terminal' : 'cpu'} size={14} />
          </span>
          <span className="font-mono font-semibold text-xs text-indigo-300">{toolName}</span>
          {args.command && (
            <span className="font-mono text-xs text-white/50 truncate max-w-[200px]">
              $ {args.command}
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {isStreaming ? (
            <span className="flex items-center space-x-1 text-xs text-amber-400">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>executing</span>
            </span>
          ) : (
            <span
              className={clsx(
                'text-xs font-semibold px-1.5 py-0.5 rounded',
                success ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
              )}
            >
              {success ? 'success' : 'error'}
            </span>
          )}
          <Icon
            name={expanded ? 'chevronDown' : 'chevronRight'}
            size={14}
            className="text-white/40"
          />
        </div>
      </div>

      {expanded && (
        <div className="p-3 border-t border-white/5 space-y-2">
          {Object.keys(args).length > 0 && (
            <div>
              <div className="text-[10px] uppercase font-bold text-white/40 mb-1">Arguments</div>
              <pre className="p-2 rounded bg-black/40 font-mono text-xs text-white/80 overflow-x-auto">
                {JSON.stringify(args, null, 2)}
              </pre>
            </div>
          )}

          <div>
            <div className="text-[10px] uppercase font-bold text-white/40 mb-1">
              {isStreaming ? 'Streaming Output' : 'Result'}
            </div>
            <pre className="p-2 rounded bg-black/60 font-mono text-xs text-emerald-400/90 whitespace-pre-wrap max-h-56 overflow-y-auto">
              {output || (isStreaming ? 'Awaiting output from host bridge...' : 'No output')}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
