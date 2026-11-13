'use client';
import { useAtomValue } from 'jotai';
import { useCallback, useState } from 'react';
import { urlSnapshotAtom } from '@/atoms';

export function useCopyShareLink() {
  const search = useAtomValue(urlSnapshotAtom);
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async (): Promise<boolean> => {
    const href =
      typeof window !== 'undefined'
        ? `${window.location.origin}${window.location.pathname}${search}`
        : search;
    try {
      await navigator.clipboard.writeText(href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      return true;
    } catch {
      return false;
    }
  }, [search]);

  return { copy, copied };
}
