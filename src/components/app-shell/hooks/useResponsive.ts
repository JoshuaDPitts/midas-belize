'use client';
import { useEffect, useState } from 'react';

const MOBILE_BREAKPOINT_PX = 768;

/**
 * Returns true when viewport width is ≤ 768px. SSR-safe: starts false (desktop)
 * and re-renders on first client effect. One frame of desktop layout on narrow
 * screens at first paint is acceptable to prevent an SSR/CSR mismatch.
 */
export function useResponsive(): boolean {
  const [isNarrow, setIsNarrow] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT_PX}px)`);
    setIsNarrow(mql.matches);
    const onChange = (e: MediaQueryListEvent) => setIsNarrow(e.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);
  return isNarrow;
}
