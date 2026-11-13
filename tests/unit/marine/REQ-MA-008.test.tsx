import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Provider, createStore } from 'jotai';
import { timeStepAtom, timeRangeAtom } from '@/atoms/index';
import { TimeSeriesPlayer } from '@/features/marine/domain/TimeSeriesPlayer';

const seriesFixture = [
  {
    id: 'sst',
    label: 'SST',
    unit: '°C',
    formula: 'monthly mean of GHRSST OSTIA SST',
    explanation: 'Sea surface temperature monthly mean from GHRSST OSTIA at the active site transect.',
    points: [
      { iso: '2023-01', value: 26.4 },
      { iso: '2023-02', value: 26.9 },
      { iso: '2023-03', value: 27.5 },
    ],
  },
];

function renderPlayer(step = 0) {
  const store = createStore();
  store.set(timeRangeAtom, ['2023-01', '2023-02', '2023-03']);
  store.set(timeStepAtom, step);
  return render(
    <Provider store={store}>
      <TimeSeriesPlayer series={seriesFixture} />
    </Provider>,
  );
}

describe('REQ-MA-008 — TimeSeriesPlayer', () => {
  it('renders one series chip per series', () => {
    renderPlayer();
    expect(screen.getByTestId('series-chip-sst')).toBeInTheDocument();
  });

  it('shows the playhead value at the current timeStep', () => {
    renderPlayer(2);
    expect(screen.getByTestId('playhead-value-sst')).toHaveTextContent('27.5');
  });

  it('renders an SVG line per series', () => {
    const { container } = renderPlayer();
    expect(container.querySelectorAll('polyline').length).toBeGreaterThanOrEqual(1);
  });

  it('exposes a formula tooltip on each series chip', () => {
    renderPlayer();
    expect(screen.getByRole('button', { name: /formula for SST/i })).toBeInTheDocument();
  });
});
