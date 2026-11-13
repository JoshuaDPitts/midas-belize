'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { useTheme } from '@/hooks/useTheme';
import { FreshnessBanner } from './components/FreshnessBanner';
import styles from './layout.module.css';

const NAV = [
  { href: '/admin/data', label: 'Datasets' },
  { href: '/admin/data/runs', label: 'Pipeline runs' },
  { href: '/admin/data/drift', label: 'Schema drift' },
  { href: '/admin/data/discovered', label: 'Discovered files' },
] as const;

function isActive(navHref: string, currentPath: string): boolean {
  if (navHref === '/admin/data') {
    return currentPath === '/admin/data' || currentPath.startsWith('/admin/data/dataset');
  }
  return currentPath === navHref || currentPath.startsWith(navHref + '/');
}

export default function AdminDataLayout({ children }: { children: ReactNode }) {
  const path = usePathname() ?? '/admin/data';
  const { theme, toggleTheme } = useTheme();

  return (
    <div className={styles.shell} data-dashboard-root>
      <aside className={styles.sidebar} aria-label="Data Ops navigation">
        <div className={styles.brand}>
          <p className={styles.kicker}>MIDAS Belize</p>
          <h1 className={styles.title}>Data Ops</h1>
          <button
            type="button"
            className={styles.themeToggle}
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}
          >
            {theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}
          </button>
        </div>
        <nav className={styles.nav}>
          <ul className={styles.navList}>
            {NAV.map((item) => {
              const active = isActive(item.href, path);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={active ? styles.navLinkActive : styles.navLink}
                    aria-current={active ? 'page' : undefined}
                  >
                    <span className={styles.navAccent} aria-hidden="true" />
                    <span className={styles.navLabel}>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <footer className={styles.footer}>
          <p className={styles.footerLine}>Data Layer</p>
          <p className={styles.footerLine}>midas-belize-prod</p>
        </footer>
      </aside>
      <main className={styles.main}>
        <FreshnessBanner />
        {children}
      </main>
    </div>
  );
}
