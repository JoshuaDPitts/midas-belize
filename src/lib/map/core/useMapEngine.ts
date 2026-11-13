'use client';
import { useMemo } from 'react';
import { useLayerStore } from './MapEngineProvider';
import type { LayerConfig } from '../layers/types';

export interface MapEngineApi {
  addLayer(cfg: LayerConfig): void;
  removeLayer(id: string): void;
  updateLayer(id: string, patch: Partial<LayerConfig>): void;
  setLayerOrder(ids: string[]): void;
  listLayers(): LayerConfig[];
}

export function useMapEngine(): MapEngineApi {
  const store = useLayerStore();
  return useMemo<MapEngineApi>(
    () => ({
      addLayer: (c) => store.addLayer(c),
      removeLayer: (id) => store.removeLayer(id),
      updateLayer: (id, p) => store.updateLayer(id, p),
      setLayerOrder: (ids) => store.setLayerOrder(ids),
      listLayers: () => store.all(),
    }),
    [store],
  );
}
