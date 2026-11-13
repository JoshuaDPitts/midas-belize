'use client';
import { useAtomValue } from 'jotai';
import { activeSiteAtom } from '@/atoms';
import { useUrlSyncProvider } from '@/atoms/url-sync';
import { useCacheBridgeProvider } from '@/atoms/cache-bridge';

/** 0-render component. Mounts the URL sync + cache bridge providers. */
export function UrlSyncMount() {
  const activeSite = useAtomValue(activeSiteAtom);
  useUrlSyncProvider();
  useCacheBridgeProvider({ activeSite });
  return null;
}
