'use client';
import type { ReactNode } from 'react';

export function DesktopShell({ children }: { children: ReactNode }) {
  return (
    <div data-testid="app-shell" data-shell="desktop" data-mobile-mode="false">
      {children}
    </div>
  );
}
