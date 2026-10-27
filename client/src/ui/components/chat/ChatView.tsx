import React, { useEffect, useRef } from 'react';
import { useChatStore } from '../../stores/chatStore';
import { useAgentStore } from '../../stores/agentStore';
import { MessageBubble } from './MessageBubble';
import { ThinkingIndicator } from './ThinkingIndicator';
import { ToolExecutionCard } from './ToolExecutionCard';

export interface ChatViewProps {
  onOpenPlan?: () => void;
}

export const ChatView: React.FC<ChatViewProps> = ({ onOpenPlan }) => {
  const { messages, activeStreamingThought, activeStreamingToolChunk, activeToolName } = useChatStore();
  const { mode } = useAgentStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  const isExecuting = mode !== 'idle' && mode !== 'error';

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeStreamingThought, activeStreamingToolChunk, mode]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2">
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} onOpenPlan={onOpenPlan} />
      ))}

      {isExecuting && (
        <div className="space-y-2">
          <ThinkingIndicator thoughtText={activeStreamingThought} />

          {activeToolName && (
            <ToolExecutionCard
              toolName={activeToolName}
              output={activeStreamingToolChunk}
              isStreaming={true}
            />
          )}
        </div>
      )}

      <div ref={bottomRef} className="h-2" />
    </div>
  );
};
