'use client';
import { useState, useCallback, type ReactNode } from 'react';
import { Icon } from '@/lib/icons';
import styles from './SecondaryAccordion.module.css';

interface SecondaryAccordionProps {
  title: string;
  peek?: string | ReactNode;
  defaultExpanded?: boolean;
  storageKey?: string;
  children: ReactNode;
}

function readPersistedState(key: string | undefined, fallback: boolean): boolean {
  if (!key || typeof window === 'undefined') return fallback;
  const v = sessionStorage.getItem(key);
  if (v === null) return fallback;
  return v === 'true';
}

export function SecondaryAccordion({
  title,
  peek,
  defaultExpanded = false,
  storageKey,
  children,
}: SecondaryAccordionProps) {
  const [expanded, setExpanded] = useState(() => readPersistedState(storageKey, defaultExpanded));

  const toggle = useCallback(() => {
    setExpanded((prev) => {
      const next = !prev;
      if (storageKey && typeof window !== 'undefined') {
        sessionStorage.setItem(storageKey, String(next));
      }
      return next;
    });
  }, [storageKey]);

  function onKey(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggle();
    }
  }

  return (
    <section className={`${styles.section} ${expanded ? styles.expanded : ''}`}>
      <button
        type="button"
        className={styles.header}
        aria-expanded={expanded}
        onClick={toggle}
        onKeyDown={onKey}
      >
        <span className={styles.title}>{title}</span>
        {!expanded && peek && <span className={styles.peek}>{peek}</span>}
        <span className={`${styles.chevron} ${expanded ? styles.chevronOpen : ''}`} aria-hidden="true">
          <Icon name="chevron-down" size={16} />
        </span>
      </button>
      <div className={styles.body} aria-hidden={!expanded}>
        <div className={styles.bodyInner}>{children}</div>
      </div>
    </section>
  );
}
