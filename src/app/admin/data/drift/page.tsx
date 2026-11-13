'use client';
import { useState } from 'react';
import type { SchemaDrift } from '@/lib/data/types';
import { useDrift } from '../hooks/useDrift';
import { DriftQueue } from '../components/DriftQueue';
import shell from '../_shared/PageShell.module.css';
import styles from './page.module.css';

const STATUS_FILTERS: Array<SchemaDrift['status']> = [
  'open',
  'accepted',
  'rejected',
  'deferred',
  'superseded',
];

const STATUS_LABEL: Record<SchemaDrift['status'], string> = {
  open: 'Open',
  accepted: 'Accepted',
  rejected: 'Rejected',
  deferred: 'Deferred',
  superseded: 'Superseded',
};

export default function DriftPage() {
  const [status, setStatus] = useState<SchemaDrift['status']>('open');
  const { tickets, loading, error } = useDrift({ status });

  const subhead = error
    ? `Error: ${error.message}`
    : loading
      ? 'Loading drift queue…'
      : `${tickets.length} ${STATUS_LABEL[status].toLowerCase()} ticket${
          tickets.length === 1 ? '' : 's'
        }`;

  return (
    <section className={shell.page} data-page="drift">
      <header className={shell.header}>
        <p className={shell.eyebrow}>Operations</p>
        <h2 className={shell.heading}>Schema drift</h2>
        <p className={shell.identifier} data-loading={loading || undefined}>
          {subhead}
        </p>
      </header>

      <div className={styles.controls}>
        <label className={styles.filterWrap}>
          <span className={styles.filterLabel}>Status</span>
          <select
            className={styles.filter}
            value={status}
            onChange={(e) => setStatus(e.target.value as SchemaDrift['status'])}
            aria-label="Filter drift tickets by status"
          >
            {STATUS_FILTERS.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
        <p className={styles.resultCount} data-result-count>
          {tickets.length} {tickets.length === 1 ? 'ticket' : 'tickets'}
        </p>
      </div>

      {error && (
        <p className={styles.errorBanner} role="alert">
          {error.message}
        </p>
      )}
      <DriftQueue tickets={tickets} loading={loading} />
    </section>
  );
}
