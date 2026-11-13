// src/lib/map/interaction/drawStateMachine.ts
// Pure state machine for ME-008 draw modes. No React, no map.
//
// Events model the relevant DOM/map events; `reduce` returns both the next
// state and any side-effect intent (`emit.commit` fires when the shape is
// complete and should be converted to a query call).

import type { InFlightShape, DrawMode } from '@/atoms';
import type { LngLat } from '@/lib/map/core/constants';

export interface DrawState {
  mode: DrawMode;
  shape: InFlightShape | null;
}

export type DrawEvent =
  | { type: 'setMode'; mode: DrawMode }
  | { type: 'click'; lngLat: LngLat }
  | { type: 'doubleClick' }
  | { type: 'escape' };

export interface DrawReduceOut {
  state: DrawState;
  /** If non-null, the draw has committed and the shape should run a query. */
  commit: InFlightShape | null;
}

export const initialState: DrawState = { mode: 'none', shape: null };

export function reduce(state: DrawState, event: DrawEvent): DrawReduceOut {
  switch (event.type) {
    case 'setMode': {
      if (event.mode === 'none') {
        return { state: { mode: 'none', shape: null }, commit: null };
      }
      return { state: { mode: event.mode, shape: null }, commit: null };
    }

    case 'escape':
      return { state: { mode: 'none', shape: null }, commit: null };

    case 'click': {
      if (state.mode === 'none') return { state, commit: null };

      if (state.mode === 'point') {
        // Single-click commits.
        const shape: InFlightShape = { mode: 'point', points: [event.lngLat] };
        return { state: { mode: 'none', shape: null }, commit: shape };
      }

      if (state.mode === 'area') {
        // Accumulate a polygon vertex. Don't commit until dbl-click.
        const pts = state.shape?.points ?? [];
        return {
          state: { mode: 'area', shape: { mode: 'area', points: [...pts, event.lngLat] } },
          commit: null,
        };
      }

      if (state.mode === 'transect') {
        const pts = state.shape?.points ?? [];
        if (pts.length === 0) {
          // First click sets start. Wait for second click.
          return {
            state: { mode: 'transect', shape: { mode: 'transect', points: [event.lngLat] } },
            commit: null,
          };
        }
        // Second click commits the line.
        const shape: InFlightShape = { mode: 'transect', points: [pts[0], event.lngLat] };
        return { state: { mode: 'none', shape: null }, commit: shape };
      }
      return { state, commit: null };
    }

    case 'doubleClick': {
      if (state.mode === 'area' && state.shape && state.shape.points.length >= 3) {
        return { state: { mode: 'none', shape: null }, commit: state.shape };
      }
      // Double-click outside area mode (or on too-small polygon) is a no-op.
      return { state, commit: null };
    }

    default: {
      const _exhaustive: never = event;
      return { state, commit: null };
    }
  }
}
