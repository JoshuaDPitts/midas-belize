'use client';
// src/lib/map/interaction/PlaybackController.tsx
// ME-009 time-series playback. Wires `timeStepAtom`, `playingAtom`,
// `playbackSpeedAtom`, `timeRangeAtom` to the DS TimeSeriesPlayer.
//
// Playback uses a `setInterval` at a fixed BASE_TICK_MS and advances the
// step when the accumulated fractional-step count (speed-scaled) crosses
// 1. This keeps the tick rate bounded and decouples the advance rate from
// the UI speed selector without creating / tearing down timers on every
// speed change.

import { useEffect, useRef } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import {
  timeRangeAtom,
  timeStepAtom,
  playingAtom,
  playbackSpeedAtom,
} from '@/atoms';
import { TimeSeriesPlayer } from '@/components/mimes/TimeSeriesPlayer/TimeSeriesPlayer';

/** Interval between ticks in ms. At speed = 1× one tick = one advance. */
export const BASE_TICK_MS = 800;

/** Pure advance function. Returns the next {step, acc, shouldPause} given
 *  the current step, accumulated fractional progress, speed, and range
 *  length. Extracted for direct unit testing without React/timers. */
export function advanceStep(
  step: number,
  acc: number,
  speed: number,
  lastIdx: number,
): { step: number; acc: number; shouldPause: boolean } {
  let s = step;
  let a = acc + speed;
  while (a >= 1) {
    a -= 1;
    const next = s + 1;
    if (next > lastIdx) {
      return { step: lastIdx, acc: 0, shouldPause: true };
    }
    s = next;
  }
  return { step: s, acc: a, shouldPause: false };
}

export function PlaybackController() {
  const range = useAtomValue(timeRangeAtom);
  const [step, setStep] = useAtom(timeStepAtom);
  const [playing, setPlaying] = useAtom(playingAtom);
  const [speed, setSpeed] = useAtom(playbackSpeedAtom);

  const stepRef = useRef(step);
  stepRef.current = step;
  const speedRef = useRef(speed);
  speedRef.current = speed;

  // Surface the current ISO month (YYYY-MM) on a wrapper element so the
  // SM-018 e2e can assert URL → atom hydration without scraping the slider.
  const currentISO = range[step]?.slice(0, 7) ?? '';

  useEffect(() => {
    if (!playing) return;
    const lastIdx = range.length - 1;
    let acc = 0;
    const id = window.setInterval(() => {
      const out = advanceStep(stepRef.current, acc, speedRef.current, lastIdx);
      acc = out.acc;
      setStep(out.step);
      if (out.shouldPause) setPlaying(false);
    }, BASE_TICK_MS);
    return () => window.clearInterval(id);
  }, [playing, range.length, setPlaying, setStep]);

  return (
    <div data-time-label={currentISO} style={{ display: 'contents' }}>
      <TimeSeriesPlayer
        steps={range}
        index={step}
        onIndexChange={(i) => setStep(i)}
        playing={playing}
        onPlayPause={() => {
          if (!playing && step >= range.length - 1) {
            // If paused at the end, restart from the beginning on play.
            setStep(0);
          }
          setPlaying(!playing);
        }}
        speed={speed}
        onSpeedChange={setSpeed}
      />
    </div>
  );
}
