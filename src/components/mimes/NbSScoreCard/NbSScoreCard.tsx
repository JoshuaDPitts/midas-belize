import type { NbSScore } from '@/types/mimes';
import styles from './NbSScoreCard.module.css';

interface NbSScoreCardProps {
  score: NbSScore;
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div className={styles.scoreRow}>
      <span className={styles.scoreLabel}>{label}</span>
      <div className={styles.barTrack}>
        <div className={styles.barFill} data-bar style={{ width: `${pct}%` }} />
      </div>
      <span className={styles.scoreValue}>{pct}%</span>
    </div>
  );
}

export function NbSScoreCard({ score }: NbSScoreCardProps) {
  return (
    <div className={styles.card}>
      <span className={styles.location}>{score.locationName}</span>
      <ScoreBar label="Restoration Potential" value={score.restorationPotential} />
      <ScoreBar label="Conservation Value" value={score.conservationValue} />
      <ScoreBar label="Combined Score" value={score.combinedScore} />
    </div>
  );
}
