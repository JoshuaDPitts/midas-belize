'use client';
import { useAtomValue } from 'jotai';
import { visibleLayersAtom } from '@/atoms';
import { _layerCatalogCacheAtom } from '@/atoms/cache-bridge';

/**
 * Returns true when any visible layer has a non-null `temporal_extent` in
 * the catalog cache. Used to gate the BottomBar (which hosts the time
 * playback controls + attribution).
 */
export function useHasTimeAwareLayer(): boolean {
  const visible = useAtomValue(visibleLayersAtom);
  const catalog = useAtomValue(_layerCatalogCacheAtom);
  return visible.some((id) => {
    const entry = catalog.find((l) => l.id === id);
    return entry?.temporal_extent != null;
  });
}
