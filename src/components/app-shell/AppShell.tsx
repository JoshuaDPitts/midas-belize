'use client';
import type { ReactNode } from 'react';
import { useResponsive } from './hooks/useResponsive';
import { DesktopShell } from './DesktopShell';
import { MobileShell } from './MobileShell';

/**
 * Top-level chrome wrapper for `/`. A 0-logic responsive switch — both
 * Desktop and Mobile shells subscribe to the same atoms, so state is
 * preserved across breakpoint changes mid-session.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const isNarrow = useResponsive();
  return isNarrow ? <MobileShell>{children}</MobileShell> : <DesktopShell>{children}</DesktopShell>;
}
