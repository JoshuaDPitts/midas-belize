'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { CatalogEntry, DatasetStatus } from '@/lib/data/types';
import { FreshnessIndicator } from './FreshnessIndicator';
import styles from './DatasetsTable.module.css';

const STATUS_FILTERS: Array<DatasetStatus | 'all'> = [
  'all',
  'published',
  'awaiting-provenance',
  'provenance-incomplete',
  'schema-drift-blocked',
  'orphaned',
  'processing',
];

const STATUS_LABEL: Record<DatasetStatus | 'all', string> = {
  all: 'All statuses',
  published: 'Published',
  'awaiting-provenance': 'Awaiting provenance',
  'provenance-incomplete': 'Provenance incomplete',
  'schema-drift-blocked': 'Schema drift blocked',
  orphaned: 'Orphaned',
  processing: 'Processing',
};

type SortKey = 'id' | 'status' | 'scope' | 'updated_at';

interface FirestoreTimestampLike {
  _seconds: number;
  _nanoseconds?: number;
  toDate?: () => Date;
}

function toDate(ts: unknown): Date | null {
  if (ts == null) return null;
  if (ts instanceof Date) return ts;
  if (typeof ts === 'number') return new Date(ts);
  if (typeof ts === 'string') {
    const d = new Date(ts);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof ts === 'object') {
    const candidate = ts as FirestoreTimestampLike;
    if (typeof candidate.toDate === 'function') return candidate.toDate();
    if (typeof candidate._seconds === 'number') return new Date(candidate._seconds * 1000);
  }
  return null;
}

function compare<T>(a: T, b: T): number {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function sortValue(entry: CatalogEntry, key: SortKey): string | number {
  if (key === 'updated_at') return toDate(entry.updated_at)?.getTime() ?? 0;
  return entry[key] ?? '';
}

export interface DatasetsTableProps {
  datasets: CatalogEntry[];
  loading?: boolean;
  now?: number;
}

export function DatasetsTable({ datasets, loading = false, now }: DatasetsTableProps) {
  const [statusFilter, setStatusFilter] = useState<DatasetStatus | 'all'>('all');
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('updated_at');
  const [sortAsc, setSortAsc] = useState(false);

  const filtered = useMemo(() => {
    let rows = datasets;
    if (statusFilter !== 'all') {
      rows = rows.filter((d) => d.status === statusFilter);
    }
    const q = query.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (d) =>
          d.id.toLowerCase().includes(q) ||
          (d.title ?? '').toLowerCase().includes(q) ||
          (d.tags ?? []).some((t) => t.toLowerCase().includes(q)),
      );
    }
    const sorted = [...rows].sort((a, b) => {
      const cmp = compare(sortValue(a, sortKey), sortValue(b, sortKey));
      return sortAsc ? cmp : -cmp;
    });
    return sorted;
  }, [datasets, statusFilter, query, sortKey, sortAsc]);

  function toggleSort(next: SortKey) {
    if (next === sortKey) {
      setSortAsc((prev) => !prev);
    } else {
      setSortKey(next);
      setSortAsc(next === 'updated_at' ? false : true);
    }
  }

  function sortIndicator(key: SortKey) {
    if (sortKey !== key) return null;
    return <span className={styles.sortIcon}>{sortAsc ? '▲' : '▼'}</span>;
  }

  return (
    <div className={styles.root} data-datasets-table>
      <div className={styles.controls}>
        <label className={styles.searchWrap}>
          <span className={styles.searchIcon} aria-hidden="true">
            ⌕
          </span>
          <input
            type="search"
            className={styles.search}
            placeholder="Search by id, title, tag…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search datasets"
          />
        </label>
        <label className={styles.filterWrap}>
          <span className={styles.filterLabel}>Status</span>
          <select
            className={styles.filter}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as DatasetStatus | 'all')}
            aria-label="Filter by status"
          >
            {STATUS_FILTERS.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
        <span className={styles.count} data-result-count>
          {filtered.length} of {datasets.length}
        </span>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col" className={styles.th}>
                <button type="button" className={styles.sortBtn} onClick={() => toggleSort('id')}>
                  ID {sortIndicator('id')}
                </button>
              </th>
              <th scope="col" className={styles.th}>
                <button
                  type="button"
                  className={styles.sortBtn}
                  onClick={() => toggleSort('status')}
                >
                  Status {sortIndicator('status')}
                </button>
              </th>
              <th scope="col" className={styles.th}>
                <button
                  type="button"
                  className={styles.sortBtn}
                  onClick={() => toggleSort('scope')}
                >
                  Scope {sortIndicator('scope')}
                </button>
              </th>
              <th scope="col" className={styles.th}>Version</th>
              <th scope="col" className={styles.th}>
                <button
                  type="button"
                  className={styles.sortBtn}
                  onClick={() => toggleSort('updated_at')}
                >
                  Updated {sortIndicator('updated_at')}
                </button>
              </th>
              <th scope="col" className={styles.th}>Tags</th>
            </tr>
          </thead>
          <tbody>
            {loading && filtered.length === 0 && (
              <tr>
                <td colSpan={6} className={styles.empty}>Loading datasets…</td>
              </tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={6} className={styles.empty}>
                  No datasets match the current filters.
                </td>
              </tr>
            )}
            {filtered.map((d) => {
              const statusKey = d.status.replaceAll('-', '_');
              const tags = d.tags ?? [];
              return (
                <tr key={d.id} className={styles.row}>
                  <td className={styles.idCell}>
                    <Link href={`/admin/data/dataset/${d.id}`} className={styles.idLink}>
                      {d.id}
                    </Link>
                  </td>
                  <td>
                    <span
                      className={`${styles.status} ${styles[`status_${statusKey}`] ?? ''}`}
                      data-status={d.status}
                    >
                      {STATUS_LABEL[d.status] ?? d.status}
                    </span>
                  </td>
                  <td className={styles.scope}>{d.scope}</td>
                  <td className={styles.version}>{d.current_version?.version ?? '—'}</td>
                  <td>
                    <FreshnessIndicator updatedAt={toDate(d.updated_at)} now={now} />
                  </td>
                  <td className={styles.tags}>
                    {tags.length === 0 ? (
                      <span className={styles.muted}>—</span>
                    ) : (
                      tags.map((t) => (
                        <span key={t} className={styles.tag}>
                          {t}
                        </span>
                      ))
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
