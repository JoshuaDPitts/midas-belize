'use client';
import { useAtomValue } from 'jotai';
import { inspectedFeatureAtom } from '@/atoms';
import { Icon } from '@/lib/icons';
import { FormulaTooltip } from '@/components/ui/FormulaTooltip';
import styles from './PolygonFocusCard.module.css';

function formatPolygonId(properties: Record<string, unknown>): string {
  const id = properties.MIMES_ID ?? properties.id ?? properties.ID ?? properties.GRID_ID ?? properties.Name;
  return id !== undefined ? String(id) : '?';
}

export function PolygonFocusCard() {
  const feature = useAtomValue(inspectedFeatureAtom);

  if (feature === null) {
    return (
      <div data-testid="polygon-focus-empty" className={styles.empty}>
        <span className={styles.emptyIcon}>
          <Icon name="crosshair" size={22} />
        </span>
        <span className={styles.emptyText}>No polygon selected — pick one from the map.</span>
      </div>
    );
  }

  const props = (feature.properties ?? {}) as Record<string, unknown>;
  const polygonId = formatPolygonId(props);
  const nbs = typeof props.NbS_Score === 'number' ? props.NbS_Score : null;
  const restoration = typeof props.Restoration_Potential === 'number' ? props.Restoration_Potential : null;
  const conservation = typeof props.Conservation_Value === 'number' ? props.Conservation_Value : null;

  return (
    <article className={styles.card}>
      {/* polygon-focus-summary kept for MA-004 backwards compat */}
      <p data-testid="polygon-focus-summary" className={styles.summary}>
        Polygon {polygonId}
        {nbs !== null && <> · NbS {nbs.toFixed(2)}</>}
      </p>

      <header className={styles.headerRow}>
        <h2 data-testid="polygon-focus-id" className={styles.polygonId}>Polygon {polygonId}</h2>
      </header>

      <dl className={styles.statsRow}>
        <div className={styles.statCell} data-testid="polygon-focus-stat-nbs">
          <dt className={styles.statLabel}>
            NbS Score
            <FormulaTooltip
              label="NbS Score"
              formula="NbS = weighted combination of Restoration Potential + Conservation Value (0–1)"
              explanation="Nature-based Solutions score — the headline indicator for how well this polygon supports a restoration-and-conservation intervention. Range 0 (no opportunity) to 1 (high-priority site). Combines the two sub-scores below."
            />
          </dt>
          <dd className={styles.statValue}>{nbs !== null ? nbs.toFixed(2) : '—'}</dd>
        </div>
        <div className={styles.statCell} data-testid="polygon-focus-stat-restoration">
          <dt className={styles.statLabel}>
            Restoration
            <FormulaTooltip
              label="Restoration Potential"
              formula="suitable_area / total_area within the polygon (0–1, shown as %)"
              explanation="Fraction of the polygon's area judged suitable for mangrove or seagrass restoration — accounts for elevation, salinity, and current land use. Higher % means more area where planting / rewilding would succeed."
            />
          </dt>
          <dd className={styles.statValue}>{restoration !== null ? `${(restoration * 100).toFixed(0)}%` : '—'}</dd>
        </div>
        <div className={styles.statCell} data-testid="polygon-focus-stat-conservation">
          <dt className={styles.statLabel}>
            Conservation
            <FormulaTooltip
              label="Conservation Value"
              formula="existing_mangrove_area / total_area within the polygon (0–1, shown as %)"
              explanation="Fraction of the polygon currently occupied by existing mangrove or other high-value habitat. Higher % means more area worth protecting from loss (distinct from Restoration which is about area to ADD)."
            />
          </dt>
          <dd className={styles.statValue}>{conservation !== null ? `${(conservation * 100).toFixed(0)}%` : '—'}</dd>
        </div>
      </dl>
    </article>
  );
}
