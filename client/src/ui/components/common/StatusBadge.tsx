import React from 'react';
import clsx from 'clsx';
import { HorizonType, StrategyType } from '../../../core/agent/types';

export interface StatusBadgeProps {
  type: 'horizon' | 'strategy' | 'status';
  value: HorizonType | StrategyType | string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ type, value, className }) => {
  let bg = 'bg-white/10 text-white';

  if (type === 'horizon') {
    switch (value) {
      case 'short':
        bg = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
        break;
      case 'medium':
        bg = 'bg-amber-500/20 text-amber-300 border-amber-500/30';
        break;
      case 'long':
        bg = 'bg-rose-500/20 text-rose-300 border-rose-500/30';
        break;
    }
  } else if (type === 'strategy') {
    switch (value) {
      case 'react':
        bg = 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30';
        break;
      case 'htn':
        bg = 'bg-purple-500/20 text-purple-300 border-purple-500/30';
        break;
      case 'lats':
        bg = 'bg-pink-500/20 text-pink-300 border-pink-500/30';
        break;
    }
  }

  return (
    <span
      className={clsx(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider border',
        bg,
        className
      )}
    >
      {value}
    </span>
  );
};
