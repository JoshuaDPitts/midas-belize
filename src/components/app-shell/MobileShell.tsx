'use client';
import type { ReactNode } from 'react';
import styles from './MobileShell.module.css';

export function MobileShell({ children }: { children: ReactNode }) {
  return (
    <div
      className={styles.mobile}
      data-testid="app-shell"
      data-shell="mobile"
      data-mobile-mode="true"
    >
      {children}
    </div>
  );
}
