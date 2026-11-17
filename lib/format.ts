export function secondsLeft(endsAt: string, serverNow: string, deviceNow: number): number {
  const end = new Date(endsAt).getTime();
  const offset = new Date(serverNow).getTime() - deviceNow;
  return Math.max(0, Math.round((end - (deviceNow + offset)) / 1000));
}

/** Positive means the server clock is ahead of this device. */
export function clockOffsetMs(serverNow: string, deviceNow: number): number {
  return new Date(serverNow).getTime() - deviceNow;
}

export function ordinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

export function formatCode(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[^A-Z2-9]/g, '')
    .replace(/[01OI]/g, '')
    .slice(0, 6);
}

export function maskCode(code: string): string {
  return code.split('').join(' ');
}

export function averageResponseMs(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

export function pct(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return Math.round((part / whole) * 100);
}

export function accuracy(correct: number, total: number): number {
  return pct(correct, total);
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p.charAt(0).toUpperCase()).join('') || '?';
}

export function displayName(raw: string): string {
  const trimmed = raw.trim().replace(/\s+/g, ' ');
  return trimmed.length === 0 ? 'player' : trimmed.slice(0, 24);
}
