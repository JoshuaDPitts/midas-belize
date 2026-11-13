import type { ServiceCell } from '@/types/mimes';
import styles from './ServiceMatrix.module.css';

interface ServiceMatrixProps {
  cells: ServiceCell[];
  ecosystemTypes: string[];
  services: string[];
}

function supplyColor(supply: number): string {
  if (supply >= 0.7) return 'var(--color-status-success)';
  if (supply >= 0.4) return 'var(--color-status-warning)';
  return 'var(--color-status-error)';
}

export function ServiceMatrix({ cells, ecosystemTypes, services }: ServiceMatrixProps) {
  const lookup = new Map(cells.map((c) => [`${c.ecosystemType}:${c.service}`, c.supply]));

  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th className={styles.corner} />
          {services.map((s) => (
            <th key={s} className={styles.header}>{s}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {ecosystemTypes.map((eco) => (
          <tr key={eco} className={styles.row}>
            <th className={styles.rowHeader}>{eco}</th>
            {services.map((svc) => {
              const supply = lookup.get(`${eco}:${svc}`) ?? 0;
              return (
                <td key={svc} className={styles.cell}>
                  <div className={styles.dot} style={{ backgroundColor: supplyColor(supply), opacity: 0.3 + supply * 0.7 }} />
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
