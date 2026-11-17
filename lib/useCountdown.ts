import { useEffect, useState } from 'react';

/**
 * Display-only countdown, corrected against the server clock.
 * The value here never decides whether an answer counts.
 */
export function useCountdown(endsAt: string | null | undefined, clockOffsetMs: number): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!endsAt) return;
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, [endsAt]);

  if (!endsAt) return 0;
  const end = new Date(endsAt).getTime();
  const remaining = end - (now + clockOffsetMs);
  return Math.max(0, remaining);
}
