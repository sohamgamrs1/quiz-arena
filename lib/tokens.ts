import { Platform } from 'react-native';

/**
 * One accent, two weights, one spacing scale. Nothing off-scale.
 * Inter is bundled (assets/fonts) and loaded once in app/_layout.tsx, so the type
 * renders identically on Android, iOS and web instead of falling back to Roboto.
 */
export const colors = {
  bg: '#08090B',
  surface: '#101216',
  raised: '#171A20',
  line: '#22262E',
  lineSoft: '#1B1F26',
  text: '#F4F5F7',
  muted: '#8A909B',
  faint: '#5D636E',
  accent: '#6E7BF2',
  accentInk: '#0A0B0F',
  accentSoft: 'rgba(110, 123, 242, 0.14)',
  accentLine: 'rgba(110, 123, 242, 0.45)',
  ok: '#3FCF8E',
  okSoft: 'rgba(63, 207, 142, 0.13)',
  okLine: 'rgba(63, 207, 142, 0.32)',
  bad: '#F0616B',
  badSoft: 'rgba(240, 97, 107, 0.13)',
  badLine: 'rgba(240, 97, 107, 0.35)',
} as const;

/** 4 / 8 / 12 / 16 / 24 / 32 / 48. Nothing else. */
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
  sm: 12,
  card: 16,
  button: 16,
  pill: 999,
} as const;

export const size = {
  label: 11,
  meta: 13,
  body: 15,
  row: 17,
  h2: 22,
  h1: 30,
} as const;

export const fonts = {
  regular: 'Inter-Regular',
  semibold: 'Inter-SemiBold',
} as const;

export const layout = {
  maxWidth: 480,
  hitArea: 44,
  buttonHeight: 54,
} as const;

export const motion = {
  fast: 180,
  max: 250,
} as const;

/** Tabular figures so scores and timers do not jitter. */
export const numeric = { fontVariant: ['tabular-nums' as const] };

export const fontFamily = Platform.select({ default: fonts.regular });
