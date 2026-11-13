'use client';
import { usePipelineStatus } from '@/lib/data';
import { DatasetsTable } from './components/DatasetsTable';
import { FreshnessHeatmap } from './components/FreshnessHeatmap';
import shell from './_shared/PageShell.module.css';
import styles from './page.module.css';

export default function DatasetsPage() {
  const { datasets, loading, error } = usePipelineStatus();
  const subhead = error
    ? `Error: ${error.message}`
    : loading
      ? 'Loading catalog…'
      : `${datasets.length} dataset${datasets.length === 1 ? '' : 's'} in catalog`;

  return (
    <section className={shell.page} data-page="datasets">
      <header className={shell.header}>
        <p className={shell.eyebrow}>Catalog</p>
        <h2 className={shell.heading}>Datasets</h2>
        <p
          className={shell.identifier}
          data-loading={loading || undefined}
          data-error={error ? '1' : undefined}
        >
          {subhead}
        </p>
      </header>
      {datasets.length > 0 && (
        <section className={styles.heatmapSection}>
          <header className={styles.sectionHeader}>
            <p className={shell.eyebrow}>Freshness heatmap</p>
          </header>
          <FreshnessHeatmap datasets={datasets} />
        </section>
      )}
      <DatasetsTable datasets={datasets} loading={loading} />
    </section>
  );
}
