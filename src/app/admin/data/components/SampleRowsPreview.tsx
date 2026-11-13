import styles from './SampleRowsPreview.module.css';

export interface SampleRowsPreviewProps {
  rows: Record<string, unknown>[];
  limit?: number;
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

export function SampleRowsPreview({ rows, limit = 10 }: SampleRowsPreviewProps) {
  if (rows.length === 0) {
    return (
      <p className={styles.empty} data-empty-rows>
        No sample rows captured for this drift.
      </p>
    );
  }
  const visible = rows.slice(0, limit);
  const cols = Array.from(new Set(visible.flatMap((r) => Object.keys(r))));
  return (
    <div className={styles.tableWrap} data-sample-rows>
      <table className={styles.table}>
        <thead>
          <tr>
            {cols.map((c) => (
              <th key={c} className={styles.th} scope="col">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visible.map((row, i) => (
            <tr key={i} className={styles.row}>
              {cols.map((c) => {
                const v = row[c];
                const isNull = v === null || v === undefined;
                return (
                  <td
                    key={c}
                    className={`${styles.td} ${isNull ? styles.tdNull : ''}`}
                  >
                    {formatCell(v)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > limit && (
        <p className={styles.footnote}>
          Showing {limit} of {rows.length} sample rows.
        </p>
      )}
    </div>
  );
}
