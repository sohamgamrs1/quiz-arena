import { colors } from './tokens';

/** Six restrained tints. Identity comes from the name, not from an emoji. */
const TINTS = [
  { bg: 'rgba(110, 123, 242, 0.16)', ink: '#A9B1FF' },
  { bg: 'rgba(63, 207, 142, 0.14)', ink: '#7FE3B8' },
  { bg: 'rgba(214, 158, 84, 0.15)', ink: '#E2B77F' },
  { bg: 'rgba(196, 120, 196, 0.15)', ink: '#DDA6DD' },
  { bg: 'rgba(94, 178, 214, 0.15)', ink: '#96CFE7' },
  { bg: 'rgba(240, 97, 107, 0.14)', ink: '#F09AA0' },
] as const;

function hash(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i += 1) {
    h = (h * 31 + input.charCodeAt(i)) % 100000;
  }
  return h;
}

/** Deterministic: the same player always gets the same tile. */
export function tintFor(seed: string): { bg: string; ink: string } {
  const index = hash(seed.trim().toLowerCase()) % TINTS.length;
  return TINTS[index] ?? TINTS[0] ?? { bg: colors.raised, ink: colors.text };
}

export function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return (parts[0] ?? '').slice(0, 2).toUpperCase();
  const first = parts[0]?.charAt(0) ?? '';
  const last = parts[parts.length - 1]?.charAt(0) ?? '';
  return (first + last).toUpperCase();
}

/** A single letter for quiz tiles. */
export function letterFor(title: string): string {
  const cleaned = title.trim();
  return cleaned.length === 0 ? '?' : cleaned.charAt(0).toUpperCase();
}
