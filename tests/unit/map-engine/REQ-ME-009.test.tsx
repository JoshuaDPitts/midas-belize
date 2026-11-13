// tests/unit/map-engine/REQ-ME-009.test.tsx
// ME-009 — time-series playback. Pure advance math + React smoke tests.
import { describe, it, expect } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { createStore, Provider } from 'jotai';
import { PlaybackController, advanceStep } from '@/lib/map/interaction/PlaybackController';
import {
  timeRangeAtom,
  timeStepAtom,
  playingAtom,
  playbackSpeedAtom,
} from '@/atoms';

const THREE = ['2024-01-01', '2024-02-01', '2024-03-01'];

describe('REQ-ME-009: advanceStep (pure)', () => {
  it('advances by 1 at speed 1×', () => {
    const out = advanceStep(0, 0, 1, 5);
    expect(out).toEqual({ step: 1, acc: 0, shouldPause: false });
  });

  it('advances by 2 at speed 2×', () => {
    const out = advanceStep(0, 0, 2, 5);
    expect(out).toEqual({ step: 2, acc: 0, shouldPause: false });
  });

  it('accumulates at speed 0.5× — two ticks produce one advance', () => {
    const first  = advanceStep(0, 0,       0.5, 5);
    expect(first).toEqual({ step: 0, acc: 0.5, shouldPause: false });
    const second = advanceStep(first.step, first.acc, 0.5, 5);
    expect(second).toEqual({ step: 1, acc: 0, shouldPause: false });
  });

  it('signals shouldPause when stepping past the last index', () => {
    const out = advanceStep(4, 0, 1, 5);
    expect(out).toEqual({ step: 5, acc: 0, shouldPause: false });
    const past = advanceStep(5, 0, 1, 5);
    expect(past).toEqual({ step: 5, acc: 0, shouldPause: true });
  });

  it('caps step at lastIdx even when a single tick would overshoot by many', () => {
    const out = advanceStep(3, 0, 100, 5);
    expect(out).toEqual({ step: 5, acc: 0, shouldPause: true });
  });
});

function mount({ step = 0, playing = false, speed = 1 } = {}) {
  const store = createStore();
  store.set(timeRangeAtom, THREE);
  store.set(timeStepAtom, step);
  store.set(playingAtom, playing);
  store.set(playbackSpeedAtom, speed);
  const utils = render(
    <Provider store={store}>
      <PlaybackController />
    </Provider>,
  );
  return { store, ...utils };
}

describe('REQ-ME-009: PlaybackController React wiring', () => {
  it('renders play button and scrubber with correct initial aria attrs', () => {
    mount({ step: 1 });
    const btn = screen.getByRole('button', { name: /play/i });
    expect(btn).toBeInTheDocument();
    const slider = screen.getByRole('slider') as HTMLInputElement;
    expect(slider.min).toBe('0');
    expect(slider.max).toBe('2');
    expect(slider.value).toBe('1');
  });

  it('scrubber change fires setStep', () => {
    const { store } = mount();
    const slider = screen.getByRole('slider') as HTMLInputElement;
    fireEvent.change(slider, { target: { value: '2' } });
    expect(store.get(timeStepAtom)).toBe(2);
  });

  it('clicking play toggles playingAtom', () => {
    const { store } = mount();
    const btn = screen.getByRole('button', { name: /play/i });
    fireEvent.click(btn);
    expect(store.get(playingAtom)).toBe(true);
  });

  it('clicking play at end-of-range restarts from step 0', () => {
    const { store } = mount({ step: THREE.length - 1 });
    const btn = screen.getByRole('button', { name: /play/i });
    fireEvent.click(btn);
    expect(store.get(timeStepAtom)).toBe(0);
    expect(store.get(playingAtom)).toBe(true);
  });

  it('speed selector writes playbackSpeedAtom', () => {
    const { store } = mount();
    const select = screen.getByLabelText(/playback speed/i) as HTMLSelectElement;
    fireEvent.change(select, { target: { value: '2' } });
    expect(store.get(playbackSpeedAtom)).toBe(2);
  });

  it('showing pause icon when playingAtom is true', () => {
    mount({ playing: true });
    expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument();
  });
});
