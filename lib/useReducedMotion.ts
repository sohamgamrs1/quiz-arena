import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let mounted = true;

    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (mounted) setReduced(value);
      })
      .catch(() => undefined);

    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (value) => {
      if (mounted) setReduced(value);
    });

    let mq: MediaQueryList | undefined;
    let handler: ((e: MediaQueryListEvent) => void) | undefined;
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.matchMedia) {
      mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      handler = (e: MediaQueryListEvent) => setReduced(e.matches);
      setReduced(mq.matches);
      mq.addEventListener('change', handler);
    }

    return () => {
      mounted = false;
      sub.remove();
      if (mq && handler) mq.removeEventListener('change', handler);
    };
  }, []);

  return reduced;
}
