import type { Provenance } from '@/lib/data/types';
import styles from './ProvenanceCard.module.css';

export function ProvenanceCard({ provenance }: { provenance: Provenance }) {
  return (
    <article className={styles.card} data-provenance-card>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Provenance</p>
      </header>
      <dl className={styles.fields}>
        <dt>Source</dt>
        <dd>{provenance.source}</dd>
        <dt>License</dt>
        <dd>{provenance.license}</dd>
        {provenance.source_url && (
          <>
            <dt>URL</dt>
            <dd>
              <a
                href={provenance.source_url}
                target="_blank"
                rel="noreferrer noopener"
                className={styles.link}
              >
                {provenance.source_url}
              </a>
            </dd>
          </>
        )}
        <dt>Citation</dt>
        <dd className={styles.citation}>{provenance.citation}</dd>
        <dt>Upstream</dt>
        <dd className={styles.upstream}>
          {provenance.upstream_paths.length === 0 ? (
            <span className={styles.muted}>—</span>
          ) : (
            provenance.upstream_paths.map((p) => (
              <code key={p} className={styles.upstreamPath}>
                {p}
              </code>
            ))
          )}
        </dd>
      </dl>
    </article>
  );
}
