'use client';
import { useEffect } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import {
  playingAtom,
  timeStepAtom,
  rfactorMonthAtom,
  manualMonthOverrideAtom,
  type RFactorMonth,
} from '@/atoms';

/** Pure helper: given the current playing state, the timestep, the
 * already-set month, and the manual-override flag, returns the next
 * month to project the rfactor atom at — or `null` if the atom should
 * NOT change. Exported for direct unit testing without the React effect. */
export function computeTimelineMonth(
  playing: boolean,
  timeStep: number,
  current: RFactorMonth | null,
  manualOverride: boolean,
): RFactorMonth | null {
  if (!playing || current === null || manualOverride) return null;
  // 1..12 cycle based on the current timeStep. WS-027 plan: month auto-
  // advances as `(timeStepAtom % 12) + 1`.
  const next = ((timeStep % 12) + 12) % 12 + 1; // robust to negative steps
  return next as RFactorMonth;
}

/** Side-effect hook that drives rfactorMonthAtom from the timeline atoms
 * when playback is running and the user hasn't manually picked a month.
 * Mount once in the watershed vertical (manifest-level or in a shell
 * component) — it's a no-op when month is null or override is set. */
export function useRFactorTimelineSync(): void {
  const playing = useAtomValue(playingAtom);
  const timeStep = useAtomValue(timeStepAtom);
  const month = useAtomValue(rfactorMonthAtom);
  const manualOverride = useAtomValue(manualMonthOverrideAtom);
  const setMonth = useSetAtom(rfactorMonthAtom);

  useEffect(() => {
    const next = computeTimelineMonth(playing, timeStep, month, manualOverride);
    if (next !== null && next !== month) {
      setMonth(next);
    }
  }, [playing, timeStep, month, manualOverride, setMonth]);
}
