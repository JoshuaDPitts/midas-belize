import type { CladeFamilyGroup } from '@/lib/map/core/clades';
import styles from './CladeLegendList.module.css';

interface CladeLegendListProps {
  /** Family-grouped clades to render, typically from `groupCladesByFamily`. */
  groups: CladeFamilyGroup[];
}

function swatchColor(rgb: readonly [number, number, number]): string {
  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
}

/**
 * Shared categorical legend body for the 25-clade scheme: one labelled section
 * per ecological family, each listing its present clades with a color swatch and
 * the verbatim UNESCO ecosystem name. Renders nothing when `groups` is empty.
 */
export function CladeLegendList({ groups }: CladeLegendListProps) {
  if (groups.length === 0) return null;
  return (
    <div className={styles.groups} data-testid="legend-clade-list">
      {groups.map((group) => (
        <section key={group.family.key} className={styles.group}>
          <h4 className={styles.familyLabel}>{group.family.label}</h4>
          <ul className={styles.cladeList}>
            {group.clades.map((clade) => (
              <li key={clade.id} className={styles.cladeRow}>
                <span
                  className={styles.swatch}
                  data-testid={`clade-swatch-${clade.id}`}
                  style={{ background: swatchColor(clade.rgb) }}
                />
                <span className={styles.cladeLabel} title={clade.name}>
                  {clade.name}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
