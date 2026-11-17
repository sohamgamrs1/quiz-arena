import { Platform } from 'react-native';

/** One accent colour, two weights, one spacing scale. Nothing off-scale. */
export const colors = {
  bg: '#0B0C0E',
  surface: '#15171B',
  surfaceRaised: '#1B1E23',
  border: '#24272E',
  text: '#F2F3F5',
  muted: '#8A9099',
  accent: '#5B8DEF',
  accentSoft: 'rgba(91, 141, 239, 0.16)',
  success: '#3DD68C',
  successSoft: 'rgba(61, 214, 140, 0.16)',
  danger: '#F2555A',
  dangerSoft: 'rgba(242, 85, 90, 0.16)',
} as const;

export const space = {
  x1: 4,
  x2: 8,
  x3: 12,
  x4: 16,
  x6: 24,
  x8: 32,
  x12: 48,
} as const;

export const radius = {
  card: 12,
  button: 16,
  pill: 999,
} as const;

export const type = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 28,
  xxl: 40,
} as const;

export const weight = {
  regular: '400',
  semibold: '600',
} as const;

export const layout = {
  maxWidth: 480,
  hitArea: 44,
} as const;

export const motion = {
  fast: 180,
  max: 250,
} as const;

export const fontFamily = Platform.select({
  web: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, system-ui, sans-serif',
  default: undefined,
});

/** Rounded, tabular numbers for scores and timers. */
export const numericFont = Platform.select({
  web: 'Inter, ui-monospace, SFMono-Regular, monospace',
  default: undefined,
});
