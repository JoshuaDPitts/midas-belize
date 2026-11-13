'use client';
// src/components/app-shell/MapAutoFitController.tsx
//
// BUG A fix: there was no `activeSite → camera` link. The camera was driven
// only by `?v=` via `useViewportUrlSync`, so selecting a site (dropdown) or
// loading a deep link (`?site=laughing-bird&v=<country-wide>`) rendered the
// site's geometry but left the camera wherever `?v=` said, never zooming to
// the site. This 0-render controller mounts `useAutoFitActiveSite` (see
// `src/lib/map/core/useSiteNavigation.ts`) inside `<MapView>` so it has map
// context, and fits the camera to `SITE_BOUNDS[activeSite]` whenever the
// active site changes. Mounted next to `<MapChrome/>` in `MapArea`.

import { useAutoFitActiveSite } from '@/lib/map';

export function MapAutoFitController() {
  useAutoFitActiveSite();
  return null;
}
