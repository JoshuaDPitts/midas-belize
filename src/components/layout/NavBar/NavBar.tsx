'use client';
import { Icon } from '@/lib/icons';
import type { Theme } from '@/atoms';
import styles from './NavBar.module.css';

interface NavItem {
  label: string;
  href: string;
}

interface NavBarProps {
  navItems: NavItem[];
  currentPath: string;
  siteSelector?: React.ReactNode;
  onToggleTheme?: () => void;
  theme?: Theme;
}

export function NavBar({ navItems, currentPath, siteSelector, onToggleTheme, theme }: NavBarProps) {
  return (
    <nav className={styles.nav}>
      <div className={styles.inner}>
        <a href="/" className={styles.logo}>MIDAS Belize</a>
        {siteSelector && <div className={styles.siteSelector}>{siteSelector}</div>}
        <div className={styles.links}>
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={`${styles.link} ${item.href === currentPath ? styles.activeLink : ''}`}
              data-active={item.href === currentPath}
            >
              {item.label}
            </a>
          ))}
        </div>
        {onToggleTheme && (
          <button className={styles.themeButton} onClick={onToggleTheme} aria-label="Toggle theme">
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={16} />
          </button>
        )}
      </div>
    </nav>
  );
}
