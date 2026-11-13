'use client';
import { Icon } from '@/lib/icons';
import { Slider } from '@/components/ui/Slider/Slider';
import styles from './TimeSeriesPlayer.module.css';

interface TimeSeriesPlayerProps {
  /** Explicit step labels. When provided, the scrubber is index-driven. */
  steps?: string[];
  /** Current index into `steps`. Falls back to `current` lookup when absent. */
  index?: number;
  /** Fires with the new step index when the scrubber is dragged. */
  onIndexChange?: (index: number) => void;

  /** Legacy string-mode props — still supported for consumers that don't
   *  pre-compute a step list. Only `current` is displayed; the start/end
   *  are used to infer a 2-step slider fallback. */
  start?: string;
  end?: string;
  current?: string;
  step?: string;
  onTimeChange?: (date: string) => void;

  onPlayPause: () => void;
  playing: boolean;
  speed: number;
  onSpeedChange: (speed: number) => void;
}

export function TimeSeriesPlayer({
  steps,
  index,
  onIndexChange,
  start,
  end,
  current,
  onTimeChange,
  onPlayPause,
  playing,
  speed,
  onSpeedChange,
}: TimeSeriesPlayerProps) {
  // Prefer explicit index-mode. Fall back to a minimal 2-step slider derived
  // from start/end so legacy callsites still render a working scrubber.
  const effectiveSteps = steps ?? (start && end ? [start, end] : ['0']);
  const effectiveIdx =
    typeof index === 'number'
      ? index
      : current && effectiveSteps.includes(current)
        ? effectiveSteps.indexOf(current)
        : 0;
  const label = steps ? steps[effectiveIdx] ?? '' : (current ?? '');
  const lastIdx = Math.max(0, effectiveSteps.length - 1);

  const handleSlider = (v: number) => {
    if (onIndexChange) onIndexChange(v);
    else if (onTimeChange) onTimeChange(effectiveSteps[v]);
  };

  return (
    <div className={styles.player}>
      <button
        className={styles.playButton}
        onClick={onPlayPause}
        aria-label={playing ? 'Pause' : 'Play'}
        data-playing={playing}
      >
        <Icon name={playing ? 'close' : 'chevron-right'} size={16} />
      </button>
      <div className={styles.scrubber}>
        <Slider
          min={0}
          max={lastIdx}
          value={effectiveIdx}
          onChange={handleSlider}
          showValue={false}
        />
      </div>
      <span className={styles.time}>{label}</span>
      <select
        className={styles.speed}
        value={speed}
        onChange={(e) => onSpeedChange(Number(e.target.value))}
        aria-label="Playback speed"
      >
        <option value={0.5}>0.5x</option>
        <option value={1}>1x</option>
        <option value={2}>2x</option>
        <option value={4}>4x</option>
      </select>
    </div>
  );
}
