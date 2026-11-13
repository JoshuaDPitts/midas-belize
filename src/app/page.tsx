'use client';
import { Suspense } from 'react';
import { AppShell } from '@/components/app-shell/AppShell';
import { MapArea } from '@/components/app-shell/MapArea';
import { NavBar } from '@/components/app-shell/NavBar';
import { SidebarRail } from '@/components/app-shell/SidebarRail';
import { SidebarPanel } from '@/components/app-shell/SidebarPanel';
import { UrlSyncMount } from '@/components/app-shell/UrlSyncMount';
import { BottomBar } from '@/components/app-shell/BottomBar';

// nuqs + atomWithStorage transitively call useSearchParams, which requires
// a Suspense boundary for static prerender (next build). The dev server
// doesn't enforce this — only `next build` / firebase deploy do.
export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <AppShell>
        <UrlSyncMount />
        <MapArea />
        <NavBar />
        <SidebarRail />
        <SidebarPanel />
        <BottomBar />
      </AppShell>
    </Suspense>
  );
}
