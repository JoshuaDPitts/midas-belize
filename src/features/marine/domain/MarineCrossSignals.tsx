'use client';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

interface MarineCrossSignals {
  highlightedGuildId: string | null;
  setHighlightedGuildId: (id: string | null) => void;
}

const Ctx = createContext<MarineCrossSignals | null>(null);

export function MarineCrossSignalsProvider({ children }: { children: ReactNode }) {
  const [highlightedGuildId, setRaw] = useState<string | null>(null);
  // Toggle: clicking the same id again clears it.
  const setHighlightedGuildId = useCallback(
    (id: string | null) => setRaw((prev) => (prev === id ? null : id)),
    [],
  );
  const value = useMemo<MarineCrossSignals>(
    () => ({ highlightedGuildId, setHighlightedGuildId }),
    [highlightedGuildId, setHighlightedGuildId],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Throws when used outside a provider — use useMarineCrossSignalsOptional for nullable contexts. */
export function useMarineCrossSignals(): MarineCrossSignals {
  const v = useContext(Ctx);
  if (v === null) throw new Error('useMarineCrossSignals must be inside MarineCrossSignalsProvider');
  return v;
}

/** Returns null when used outside a provider — safe for test fixtures and optional consumers. */
export function useMarineCrossSignalsOptional(): MarineCrossSignals | null {
  return useContext(Ctx);
}
