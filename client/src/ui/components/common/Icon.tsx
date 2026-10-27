import React from 'react';
import * as LucideIcons from 'lucide-react';

export interface IconProps {
  name: string;
  className?: string;
  size?: number;
}

export const Icon: React.FC<IconProps> = ({ name, className = 'w-5 h-5', size = 20 }) => {
  // Map common names to Lucide icons
  const iconMap: Record<string, any> = {
    send: LucideIcons.Send,
    terminal: LucideIcons.Terminal,
    cpu: LucideIcons.Cpu,
    brain: LucideIcons.Brain,
    git: LucideIcons.GitBranch,
    layers: LucideIcons.Layers,
    settings: LucideIcons.Settings,
    database: LucideIcons.Database,
    folder: LucideIcons.Folder,
    check: LucideIcons.Check,
    alert: LucideIcons.AlertTriangle,
    refresh: LucideIcons.RefreshCw,
    chevronDown: LucideIcons.ChevronDown,
    chevronRight: LucideIcons.ChevronRight,
    close: LucideIcons.X,
    sparkles: LucideIcons.Sparkles,
    play: LucideIcons.Play,
    zap: LucideIcons.Zap,
    android: LucideIcons.Smartphone,
  };

  const Component = iconMap[name] || LucideIcons.HelpCircle;
  return <Component className={className} size={size} />;
};
