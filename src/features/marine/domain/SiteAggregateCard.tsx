'use client';
import { FormulaTooltip } from '@/components/ui/FormulaTooltip';
import { Icon } from '@/lib/icons';
import { cladeName } from '@/lib/map/core/clades';
import styles from './SiteAggregateCard.module.css';

interface SiteAggregateCardProps {
  siteLabel: string;
  polygonCount: number;
  avgNbSScore: number | null;
  totalBiomass: number | null;
  topClades: Array<{ index: number; share: number }>;
  loading: boolean;
}

export function SiteAggregateCard({
  siteLabel,
  polygonCount,
  avgNbSScore,
  totalBiomass,
  topClades,
  loading,
}: SiteAggregateCardProps) {
  if (loading) {
    return (
      <article className={styles.card} data-testid="site-aggregate-skeleton">
        <div className={styles.skeletonLine} style={{ width: '60%' }} />
        <div className={styles.skeletonLine} style={{ width: '90%' }} />
        <div className={styles.skeletonLine} style={{ width: '75%' }} />
      </article>
    );
  }

  return (
    <article className={styles.card}>
      <header className={styles.heroLabel} data-testid="site-aggregate-label">
        {siteLabel}
      </header>
      <p className={styles.subtitle}>Marine ecosystem overview</p>

      <dl className={styles.statsGrid}>
        <div className={styles.statCell}>
          <dt className={styles.statLabel}>Polygons</dt>
          <dd className={styles.statValue}>{polygonCount}</dd>
        </div>
        <div className={styles.statCell}>
          <dt className={styles.statLabel}>
            Avg NbS
            <FormulaTooltip
              label="Average NbS"
              formula="avg(NbS_Score) over all marine polygons at this site"
              explanation="Mean Nature-based Solutions score across all non-watershed polygon families at the active site. Higher = more average mangrove restoration + conservation opportunity."
            />
          </dt>
          <dd className={styles.statValue}>{avgNbSScore !== null ? avgNbSScore.toFixed(2) : '—'}</dd>
        </div>
        <div className={styles.statCell}>
          <dt className={styles.statLabel}>Biomass</dt>
          <dd className={styles.statValue}>{totalBiomass !== null ? `${totalBiomass.toFixed(1)} t` : '—'}</dd>
        </div>
        <div className={styles.statCell}>
          <dt className={styles.statLabel}>Top clades</dt>
          <dd className={styles.statValue}>
            {topClades.length === 0
              ? '—'
              : topClades.map((c) => cladeName(c.index) ?? `#${c.index}`).join(' · ')}
          </dd>
        </div>
      </dl>

      <div className={styles.cta} data-testid="site-aggregate-cta">
        <span className={styles.ctaIcon} aria-hidden="true">
          <Icon name="crosshair" size={20} />
        </span>
        <p className={styles.ctaText}>Pick a polygon on the map to dive in</p>
      </div>
    </article>
  );
}
