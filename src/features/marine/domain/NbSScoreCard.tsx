import { FormulaTooltip } from '@/components/ui/FormulaTooltip';
import styles from './NbSScoreCard.module.css';

interface NbSScoreCardProps {
  polygonId: string | number;
  restorationPotential: number;
  conservationValue: number;
  nbsScore: number;
  siteRange: { min: number; max: number };
  /** Optional array of NbS scores for all polygons at the active site.
   *  When provided, renders selected-polygon rank context. */
  siteScores?: number[];
}

export interface SelectedNbsContext {
  rank: number;
  total: number;
  percentile: number;
}

const FORMULAS = {
  restoration: '(Suitable_Elev_Pct/100) × (1 − Mangrove_Pct_in_Suitable/100)',
  conservation: 'Mangrove_Pct_Total / 100',
  nbs: 'NbS_Score = Restoration_Potential + Conservation_Value',
};

const EXPLANATION =
  'NbS Score is mangrove-centric. It combines two things: how much room there is to restore mangroves at this polygon, plus how much mangrove is already there. Higher = better candidate for nature-based intervention.';

function nbsToColor(score: number, range: { min: number; max: number }): string {
  const span = range.max - range.min || 1;
  const t = Math.min(1, Math.max(0, (score - range.min) / span));
  return `color-mix(in oklch, var(--color-accent) ${Math.round(t * 100)}%, var(--color-text-secondary))`;
}

export function computeSelectedNbsContext(
  nbsScore: number,
  siteScores: number[] | undefined,
): SelectedNbsContext | null {
  const scores = (siteScores ?? []).filter((v) => Number.isFinite(v));
  if (scores.length === 0) return null;
  const rank = scores.filter((v) => v > nbsScore).length + 1;
  const atOrBelow = scores.filter((v) => v <= nbsScore).length;
  return {
    rank,
    total: scores.length,
    percentile: Math.round((atOrBelow / scores.length) * 100),
  };
}

function ScoreBar({
  label,
  value,
  testId,
}: { label: string; value: number; testId: string }) {
  const pct = Math.round(value * 100);
  return (
    <div className={styles.scoreRow}>
      <span className={styles.scoreLabel}>{label}</span>
      <div
        className={styles.barTrack}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
        data-testid={testId}
      >
        <div className={styles.barFill} style={{ width: `${pct}%` }} />
      </div>
      <span className={styles.scoreValue}>{pct}%</span>
    </div>
  );
}

export function NbSScoreCard({
  polygonId,
  restorationPotential,
  conservationValue,
  nbsScore,
  siteRange,
  siteScores,
}: NbSScoreCardProps) {
  const context = computeSelectedNbsContext(nbsScore, siteScores);

  return (
    <section className={styles.card}>
      <header data-testid="nbs-header" className={styles.header}>
        <span>NbS Score — Mangrove</span>
        <FormulaTooltip
          label="NbS Score"
          formula={`${FORMULAS.restoration}\n${FORMULAS.conservation}\n${FORMULAS.nbs}`}
          explanation={EXPLANATION}
        />
      </header>
      <div
        data-testid="nbs-headline"
        className={styles.headline}
        style={{ color: nbsToColor(nbsScore, siteRange) }}
      >
        {nbsScore.toFixed(2)}
      </div>
      <div className={styles.bars}>
        <ScoreBar label="Restoration Potential" value={restorationPotential} testId="nbs-restoration-bar" />
        <ScoreBar label="Conservation Value" value={conservationValue} testId="nbs-conservation-bar" />
      </div>

      {siteScores && siteScores.length > 0 && (
        <dl className={styles.context} aria-label="Selected polygon NbS context">
          <div className={styles.contextItem}>
            <dt>Site rank</dt>
            <dd data-testid="nbs-site-rank">
              {context ? `${context.rank} of ${context.total}` : '—'}
            </dd>
          </div>
          <div className={styles.contextItem}>
            <dt>Relative standing</dt>
            <dd data-testid="nbs-site-percentile">
              {context ? `Higher than ${Math.max(0, context.percentile - 1)}%` : '—'}
            </dd>
          </div>
          <div className={styles.contextItem}>
            <dt>Site range</dt>
            <dd>{siteRange.min.toFixed(2)}–{siteRange.max.toFixed(2)}</dd>
          </div>
        </dl>
      )}

      <footer className={styles.footer}>Polygon {polygonId}</footer>
    </section>
  );
}
