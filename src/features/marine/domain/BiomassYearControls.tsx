'use client';
import { useEffect, useRef, useState } from 'react';
import { useAtom } from 'jotai';
import { coralYearAtom } from '@/atoms';
import { useCoralBiomass } from './useCoralBiomass';
import { nextYearIndex } from './coralPlayback';
import styles from './BiomassYearControls.module.css';

const STEP_MS = 900;

/** Year scrubber + play/pause for the Laughing Bird coral-biomass viewer.
 * Binds to `coralYearAtom` (null = latest year). Auto-advances on an
 * interval while playing, looping back to the first year at the end.
 * Disabled entirely when fewer than 2 years are available. */
export function BiomassYearControls() {
  const { years, loading } = useCoralBiomass();
  const [year, setYear] = useAtom(coralYearAtom);
  const [playing, setPlaying] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const effectiveYear = year ?? (years.length > 0 ? years[years.length - 1] : null);
  const currentIdx = effectiveYear !== null ? years.indexOf(effectiveYear) : -1;
  const canPlay = years.length > 1;

  // Auto-advance while playing. Stops itself (and flips `playing` back off)
  // if the dataset shrinks to <=1 year mid-flight.
  useEffect(() => {
    if (!playing || !canPlay) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    intervalRef.current = setInterval(() => {
      setYear((prevYear) => {
        const idx = prevYear !== null ? years.indexOf(prevYear) : years.length - 1;
        const safeIdx = idx === -1 ? years.length - 1 : idx;
        const next = nextYearIndex(safeIdx, years.length);
        return years[next];
      });
    }, STEP_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, canPlay, years]);

  // Stop playback if the underlying years array becomes too short to play.
  useEffect(() => {
    if (!canPlay) setPlaying(false);
  }, [canPlay]);

  function togglePlaying() {
    if (!canPlay) return;
    setPlaying((p) => !p);
  }

  function onScrub(e: React.ChangeEvent<HTMLInputElement>) {
    const idx = Number(e.target.value);
    if (Number.isNaN(idx) || !years[idx]) return;
    setYear(years[idx]);
  }

  function stepBy(delta: number) {
    if (years.length === 0) return;
    const base = currentIdx === -1 ? years.length - 1 : currentIdx;
    const next = Math.min(years.length - 1, Math.max(0, base + delta));
    setYear(years[next]);
  }

  if (loading || years.length === 0) {
    return (
      <div className={styles.wrapper} data-testid="biomass-year-controls" aria-busy="true">
        <span className={styles.yearLabel}>{loading ? 'Loading…' : 'No data'}</span>
      </div>
    );
  }

  return (
    <div className={styles.wrapper} data-testid="biomass-year-controls">
      <button
        type="button"
        className={styles.playButton}
        onClick={togglePlaying}
        disabled={!canPlay}
        aria-pressed={playing}
        aria-label={playing ? 'Pause playback' : 'Play playback'}
        title={canPlay ? (playing ? 'Pause' : 'Play') : 'Only one year available'}
        data-testid="biomass-play-toggle"
      >
        {playing ? (
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
            <rect x="2" y="1" width="4" height="12" rx="1" fill="currentColor" />
            <rect x="8" y="1" width="4" height="12" rx="1" fill="currentColor" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
            <path d="M3 1.5 L12 7 L3 12.5 Z" fill="currentColor" />
          </svg>
        )}
      </button>

      <button
        type="button"
        className={styles.stepButton}
        onClick={() => stepBy(-1)}
        disabled={currentIdx <= 0}
        aria-label="Previous year"
        data-testid="biomass-step-prev"
      >
        ‹
      </button>

      <input
        type="range"
        className={styles.slider}
        min={0}
        max={years.length - 1}
        step={1}
        value={currentIdx === -1 ? years.length - 1 : currentIdx}
        onChange={onScrub}
        aria-label="Year"
        aria-valuetext={String(effectiveYear)}
        data-testid="biomass-year-slider"
      />

      <button
        type="button"
        className={styles.stepButton}
        onClick={() => stepBy(1)}
        disabled={currentIdx === -1 || currentIdx >= years.length - 1}
        aria-label="Next year"
        data-testid="biomass-step-next"
      >
        ›
      </button>

      <span className={styles.yearLabel} data-testid="biomass-year-label">
        {effectiveYear}
      </span>
    </div>
  );
}
