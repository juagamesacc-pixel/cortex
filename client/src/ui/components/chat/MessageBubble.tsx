import React, { useState } from 'react';
import { ChatMessageItem } from '../../stores/chatStore';
import { ToolExecutionCard } from './ToolExecutionCard';
import { PlanCard } from './PlanCard';
import { Icon } from '../common/Icon';
import clsx from 'clsx';

export interface MessageBubbleProps {
  message: ChatMessageItem;
  onOpenPlan?: () => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, onOpenPlan }) => {
  const isUser = message.sender === 'user';
  const [showSteps, setShowSteps] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard?.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className={clsx('flex flex-col my-3 max-w-[92%]', isUser ? 'ml-auto items-end' : 'mr-auto items-start')}>
      <div className="flex items-center space-x-1.5 mb-1 px-1">
        <span className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">
          {isUser ? 'You' : 'Cortex'}
        </span>
        {message.durationMs && (
          <span className="text-[10px] text-white/30">
            • {(message.durationMs / 1000).toFixed(1)}s
          </span>
        )}
      </div>

      <div
        className={clsx(
          'relative px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-md',
          isUser
            ? 'bg-[#6750A4] text-white rounded-tr-none'
            : 'bg-[#211F26] text-[#E6E1E5] border border-white/5 rounded-tl-none'
        )}
      >
        <div className="whitespace-pre-wrap select-text">{message.content}</div>

        {/* Embedded HTN Plan if present */}
        {message.plan && (
          <PlanCard plan={message.plan} onOpenPlanPanel={onOpenPlan} />
        )}

        {/* Actions toggle for ReAct steps if present */}
        {message.steps && message.steps.length > 0 && (
          <div className="mt-3 pt-2 border-t border-white/10">
            <button
              onClick={() => setShowSteps(!showSteps)}
              className="flex items-center space-x-1 text-xs text-purple-300 hover:text-white transition-colors cursor-pointer"
            >
              <Icon name={showSteps ? 'chevronDown' : 'chevronRight'} size={14} />
              <span>{message.steps.length} reasoning & tool steps</span>
            </button>

            {showSteps && (
              <div className="mt-2 space-y-2">
                {message.steps.map((st) => (
                  <div key={st.index} className="p-2 rounded-lg bg-black/30 border border-white/5 text-xs">
                    <div className="font-semibold text-purple-300">Step {st.index}: {st.thought}</div>
                    {st.action && (
                      <ToolExecutionCard
                        toolCall={st.action}
                        output={st.observation}
                        success={!st.observation?.includes('Error')}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Bottom utility icons */}
        <div className="flex justify-end mt-2 pt-1">
          <button
            onClick={handleCopy}
            className="p-1 rounded hover:bg-white/10 text-white/40 hover:text-white transition-colors"
            title="Copy content"
          >
            <Icon name={copied ? 'check' : 'layers'} size={12} />
          </button>
        </div>
      </div>
    </div>
  );
};
