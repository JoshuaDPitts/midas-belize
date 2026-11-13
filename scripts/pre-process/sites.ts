import type { SiteId } from '@/lib/data/types'

/**
 * Source-of-truth for all currently-active sites. When a site is added:
 *   1. Add it here.
 *   2. Run `pnpm preprocess --rebuild-visible-at` to update all
 *      national/multi-site datasets.
 */
export const ACTIVE_SITES: readonly SiteId[] = ['placencia', 'caye-caulker', 'laughing-bird']

export function isActiveSite(s: string): s is SiteId {
  return (ACTIVE_SITES as readonly string[]).includes(s)
}
