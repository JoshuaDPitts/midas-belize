'use client';
import { useAtom } from 'jotai';
import { coralClimateAtom, coralPlanAtom } from '@/atoms';
import styles from './ClimateRestorationSelector.module.css';

interface Cell {
  climate: 0 | 1;
  plan: 0 | 1;
  label: string;
  description: string;
}

const CLIMATE_ROWS: { value: 0 | 1; label: string }[] = [
  { value: 0, label: 'SSP-2.5' },
  { value: 1, label: 'SSP-4.5' },
];

const PLAN_COLS: { value: 0 | 1; label: string }[] = [
  { value: 0, label: 'No restoration' },
  { value: 1, label: 'Restoration' },
];

const CELLS: Cell[] = CLIMATE_ROWS.flatMap((row) =>
  PLAN_COLS.map((col) => ({
    climate: row.value,
    plan: col.value,
    label: `${row.label} / ${col.label}`,
    description: `${row.value === 0 ? 'SSP-2.5 low-emissions sea-surface-temperature forcing' : 'SSP-4.5 sea-surface-temperature forcing'}, ${col.value === 0 ? 'no reef restoration plan implemented' : 'reef restoration plan implemented'}.`,
  })),
);

function cellKey(climate: 0 | 1, plan: 0 | 1): string {
  return `${climate}|${plan}`;
}

/** Compact 2x2 matrix picking the Laughing Bird coral scenario: rows are
 * the climate forcing, columns are the restoration plan. Radiogroup
 * semantics over the 4 cells so screen readers announce it as a single
 * choice of 4, with arrow-key navigation like EncoderPicker / ScenarioPicker. */
export function ClimateRestorationSelector() {
  const [climate, setClimate] = useAtom(coralClimateAtom);
  const [plan, setPlan] = useAtom(coralPlanAtom);

  const activeKey = cellKey(climate, plan);

  function select(cell: Cell) {
    setClimate(cell.climate);
    setPlan(cell.plan);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (!['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
    e.preventDefault();
    const idx = CELLS.findIndex((c) => cellKey(c.climate, c.plan) === activeKey);
    const cols = PLAN_COLS.length;
    let next = idx;
    if (e.key === 'ArrowRight') next = (idx + 1) % CELLS.length;
    if (e.key === 'ArrowLeft') next = (idx - 1 + CELLS.length) % CELLS.length;
    if (e.key === 'ArrowDown') next = (idx + cols) % CELLS.length;
    if (e.key === 'ArrowUp') next = (idx - cols + CELLS.length) % CELLS.length;
    select(CELLS[next]);
  }

  return (
    <div className={styles.wrapper} data-testid="climate-restoration-selector">
      <div className={styles.headerRow} aria-hidden="true">
        <span className={styles.cornerLabel} />
        {PLAN_COLS.map((col) => (
          <span key={col.value} className={styles.colLabel}>
            {col.label}
          </span>
        ))}
      </div>
      <div
        role="radiogroup"
        aria-label="Coral scenario: climate x restoration"
        className={styles.grid}
        onKeyDown={onKeyDown}
      >
        {CLIMATE_ROWS.map((row) => (
          <div key={row.value} className={styles.row}>
            <span className={styles.rowLabel} aria-hidden="true">
              {row.label}
            </span>
            {PLAN_COLS.map((col) => {
              const cell = CELLS.find((c) => c.climate === row.value && c.plan === col.value)!;
              const active = activeKey === cellKey(cell.climate, cell.plan);
              return (
                <button
                  key={col.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  aria-label={cell.label}
                  title={cell.description}
                  data-testid={`crs-cell-${cell.climate}-${cell.plan}`}
                  className={`${styles.cell} ${active ? styles.cellActive : ''}`}
                  tabIndex={active ? 0 : -1}
                  onClick={() => select(cell)}
                >
                  <span className={styles.cellDot} aria-hidden="true" />
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
