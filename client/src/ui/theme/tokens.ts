export const CORTEX_THEME = {
  colors: {
    primary: '#6750A4',
    primaryContainer: '#EADDFF',
    onPrimary: '#FFFFFF',
    onPrimaryContainer: '#21005D',

    surface: '#141218',
    surfaceContainer: '#211F26',
    surfaceContainerHigh: '#2B2930',
    surfaceBright: '#3B383E',
    surfaceCard: 'rgba(33, 31, 38, 0.85)',

    outline: '#938F99',
    outlineVariant: '#49454F',

    // Cognitive Status Accents
    thinking: '#D0BCFF',
    acting: '#4CAF50',
    reflecting: '#FFB74D',
    critic: '#64B5F6',
    error: '#F2B8B5',

    // Horizon Badges
    horizonShort: '#4CAF50',
    horizonMedium: '#FF9800',
    horizonLong: '#E91E63',
  },
  typography: {
    fontSans: '"Plus Jakarta Sans", system-ui, -apple-system, sans-serif',
    fontMono: '"JetBrains Mono", monospace',
  },
  elevation: {
    level1: '0 1px 3px 1px rgba(0, 0, 0, 0.25), 0 1px 2px 0 rgba(0, 0, 0, 0.3)',
    level2: '0 2px 6px 2px rgba(0, 0, 0, 0.25), 0 1px 2px 0 rgba(0, 0, 0, 0.3)',
    level3: '0 4px 8px 3px rgba(0, 0, 0, 0.25), 0 1px 3px 0 rgba(0, 0, 0, 0.3)',
    glass: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
  },
} as const;
