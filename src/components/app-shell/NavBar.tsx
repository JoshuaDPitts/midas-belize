'use client';
import { useState } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { activeSiteAtom, isDefaultViewAtom, sidebarPanelAtom } from '@/atoms';
import type { SiteId } from '@/lib/map/core/constants';
import { Icon } from '@/lib/icons';
import { useTheme } from '@/hooks/useTheme';
import { useCopyShareLink } from '@/atoms/use-copy-share-link';
import { useResetToDefaults } from '@/atoms/use-reset-to-defaults';
import { useResponsive } from './hooks/useResponsive';
import styles from './NavBar.module.css';

const SITE_OPTIONS: { id: SiteId | null; label: string }[] = [
  { id: null,            label: 'Belize-wide' },
  { id: 'placencia',     label: 'Placencia' },
  { id: 'caye-caulker',  label: 'Caye Caulker' },
  { id: 'laughing-bird', label: 'Laughing Bird Caye' },
];

export function NavBar() {
  const [activeSite, setActiveSite] = useAtom(activeSiteAtom);
  const setSidebarPanel = useSetAtom(sidebarPanelAtom);
  const { theme, toggleTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isDefault = useAtomValue(isDefaultViewAtom);
  const reset = useResetToDefaults();
  const { copy, copied } = useCopyShareLink();
  const isNarrow = useResponsive();

  const activeLabel =
    SITE_OPTIONS.find((o) => o.id === activeSite)?.label ?? 'Belize-wide';

  // Picking a real site (i.e. not "Belize-wide") opens the Domain panel so
  // the marine hero is visible. Picking "Belize-wide" leaves the panel alone.
  function pickSite(id: SiteId | null) {
    setActiveSite(id);
    if (id !== null) setSidebarPanel('domain');
  }

  if (isNarrow) {
    return (
      <>
        <nav
          className={`${styles.nav} ${styles.mobileNav}`}
          aria-label="App navigation (mobile)"
          data-testid="appshell-mobile-nav"
        >
          <button
            type="button"
            className={styles.iconButton}
            data-testid="appshell-hamburger"
            aria-label="Open menu"
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen(true)}
          >
            <Icon name="menu" size={18} />
          </button>
          <span className={styles.mobileLabel}>{activeLabel}</span>
          <button
            type="button"
            className={styles.iconButton}
            data-testid="appshell-theme-toggle"
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            onClick={toggleTheme}
          >
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={16} />
          </button>
        </nav>
        {mobileMenuOpen && (
          <div
            className={styles.mobileMenu}
            data-testid="appshell-mobile-menu"
            role="dialog"
            aria-modal="true"
          >
            <header className={styles.mobileMenuHeader}>
              <span className={styles.mobileMenuTitle}>Menu</span>
              <button
                type="button"
                className={styles.iconButton}
                aria-label="Close menu"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Icon name="x" size={16} />
              </button>
            </header>
            <section className={styles.mobileMenuSection}>
              <h3 className={styles.mobileMenuSectionTitle}>Site</h3>
              <ul className={styles.mobileMenuList} role="listbox" aria-label="Site selector">
                {SITE_OPTIONS.map((opt) => (
                  <li key={opt.id ?? 'national'}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={opt.id === activeSite}
                      className={`${styles.menuItem} ${
                        opt.id === activeSite ? styles.menuItemActive : ''
                      }`}
                      onClick={() => {
                        pickSite(opt.id);
                        setMobileMenuOpen(false);
                      }}
                    >
                      {opt.label}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
            <section className={styles.mobileMenuSection}>
              <h3 className={styles.mobileMenuSectionTitle}>Actions</h3>
              <button
                type="button"
                className={styles.mobileMenuAction}
                data-testid="appshell-share"
                onClick={() => void copy()}
              >
                <Icon name="link" size={16} />
                <span>Copy share link</span>
                {copied && <span className={styles.feedback}>Copied ✓</span>}
              </button>
              <button
                type="button"
                className={styles.mobileMenuAction}
                data-testid="appshell-reset"
                disabled={isDefault}
                onClick={() => {
                  reset();
                  setMobileMenuOpen(false);
                }}
              >
                <Icon name="rotate-ccw" size={16} />
                <span>Reset view</span>
              </button>
            </section>
          </div>
        )}
      </>
    );
  }

  return (
    <nav className={styles.nav} aria-label="App navigation">
      <span className={styles.logo} data-testid="appshell-logo">
        MIDAS Belize
      </span>
      <div className={styles.center}>
        <button
          type="button"
          className={styles.siteTrigger}
          data-testid="appshell-site-trigger"
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span className={styles.triggerLabel}>{activeLabel}</span>
          <span className={styles.triggerChevron} aria-hidden>
            <Icon name="chevron-down" size={14} />
          </span>
        </button>
        {open && (
          <ul className={styles.menu} role="listbox" aria-label="Site selector">
            {SITE_OPTIONS.map((opt) => (
              <li key={opt.id ?? 'national'}>
                <button
                  type="button"
                  role="option"
                  aria-selected={opt.id === activeSite}
                  className={`${styles.menuItem} ${
                    opt.id === activeSite ? styles.menuItemActive : ''
                  }`}
                  onClick={() => {
                    pickSite(opt.id);
                    setOpen(false);
                  }}
                >
                  {opt.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className={styles.right}>
        <button
          type="button"
          className={styles.iconButton}
          data-testid="appshell-share"
          aria-label="Copy share link"
          onClick={() => void copy()}
        >
          <Icon name="link" size={16} />
        </button>
        {copied && <span className={styles.feedback}>Copied ✓</span>}
        <button
          type="button"
          className={styles.iconButton}
          data-testid="appshell-reset"
          aria-label="Reset view"
          disabled={isDefault}
          onClick={reset}
        >
          <Icon name="rotate-ccw" size={16} />
        </button>
        <button
          type="button"
          className={styles.iconButton}
          data-testid="appshell-theme-toggle"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
        >
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={16} />
        </button>
      </div>
    </nav>
  );
}
