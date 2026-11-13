'use client';
import { useState } from 'react';
import type { DiscoveredFile } from '@/lib/data/types';
import { useDiscovered } from '../hooks/useDiscovered';
import { DiscoveredFilesList } from '../components/DiscoveredFilesList';
import shell from '../_shared/PageShell.module.css';
import styles from './page.module.css';

const STATUS_FILTERS: Array<DiscoveredFile['status']> = [
  'unrecognized',
  'pending_converter',
  'ignored',
];

const STATUS_LABEL: Record<DiscoveredFile['status'], string> = {
  unrecognized: 'Unrecognized',
  pending_converter: 'Pending converter',
  ignored: 'Ignored',
};

export default function DiscoveredPage() {
  const [status, setStatus] = useState<DiscoveredFile['status']>('unrecognized');
  const { files, loading, error, refresh } = useDiscovered({ status });

  const subhead = error
    ? `Error: ${error.message}`
    : loading
      ? 'Loading discovered files…'
      : `${files.length} ${STATUS_LABEL[status].toLowerCase()} ${
          files.length === 1 ? 'file' : 'files'
        }`;

  return (
    <section className={shell.page} data-page="discovered">
      <header className={shell.header}>
        <p className={shell.eyebrow}>Operations</p>
        <h2 className={shell.heading}>Discovered files</h2>
        <p className={shell.identifier} data-loading={loading || undefined}>
          {subhead}
        </p>
        <p className={styles.subtitle}>
          Files the crawler saw but no converter claimed. Add a converter and suggest it
          here, or mark as permanently ignored.
        </p>
      </header>

      <div className={styles.controls}>
        <label className={styles.filterWrap}>
          <span className={styles.filterLabel}>Status</span>
          <select
            className={styles.filter}
            value={status}
            onChange={(e) =>
              setStatus(e.target.value as DiscoveredFile['status'])
            }
            aria-label="Filter discovered files by status"
          >
            {STATUS_FILTERS.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
        <p className={styles.resultCount} data-result-count>
          {files.length} {files.length === 1 ? 'file' : 'files'}
        </p>
      </div>

      {error && (
        <p className={styles.errorBanner} role="alert">
          {error.message}
        </p>
      )}
      <DiscoveredFilesList
        files={files}
        loading={loading}
        onRefresh={refresh}
      />
    </section>
  );
}
