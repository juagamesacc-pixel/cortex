import React, { useState, useRef } from 'react';
import { Icon } from '../common/Icon';
import { useAgentStore } from '../../stores/agentStore';
import clsx from 'clsx';

export interface InputBarProps {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export const InputBar: React.FC<InputBarProps> = ({ onSend, disabled = false }) => {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { mode } = useAgentStore();
  const isExecuting = mode !== 'idle' && mode !== 'error';

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if (!input.trim() || isExecuting || disabled) return;
    onSend(input);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  return (
    <div className="p-3 bg-[#1C1B1F]/90 backdrop-blur-md border-t border-white/5">
      <div className="flex items-end space-x-2 bg-[#2B2930] rounded-3xl p-1.5 pl-4 border border-white/10 shadow-lg focus-within:border-purple-400/50 transition-colors">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={isExecuting ? 'Cortex is executing...' : 'Ask or give a goal (e.g. "deploy rest api", "ls -la")...'}
          disabled={isExecuting || disabled}
          rows={1}
          className="flex-1 bg-transparent text-sm text-white placeholder-white/40 resize-none outline-none max-h-32 py-2"
        />

        <button
          onClick={handleSubmit}
          disabled={!input.trim() || isExecuting || disabled}
          className={clsx(
            'w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer',
            input.trim() && !isExecuting
              ? 'bg-[#6750A4] text-white hover:bg-[#7D64B8] active:scale-95 shadow-md'
              : 'bg-white/5 text-white/30 cursor-not-allowed'
          )}
        >
          <Icon name="send" size={16} />
        </button>
      </div>
    </div>
  );
};
