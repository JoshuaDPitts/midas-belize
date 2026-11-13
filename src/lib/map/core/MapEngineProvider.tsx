'use client';
import { createContext, useContext, useMemo, useRef, type ReactNode } from 'react';
import { LayerStore } from './layerStore';

const Ctx = createContext<LayerStore | null>(null);

export function MapEngineProvider({ children }: { children: ReactNode }) {
  const existing = useContext(Ctx);
  const storeRef = useRef<LayerStore | null>(null);
  if (!storeRef.current) storeRef.current = new LayerStore();
  // Idempotent: if a parent already provided a store, reuse it so nested
  // MapEngineProviders (e.g. MapView's internal one) don't fork state.
  const store = existing ?? storeRef.current;
  const value = useMemo(() => store, [store]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLayerStore(): LayerStore {
  const s = useContext(Ctx);
  if (!s) throw new Error('useLayerStore must be used inside <MapView>');
  return s;
}
