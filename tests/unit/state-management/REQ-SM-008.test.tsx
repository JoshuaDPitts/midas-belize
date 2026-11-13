import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useAtomValue } from 'jotai';
import { activeSiteAtom, timeStepAtom, visibleLayersAtom } from '@/atoms';
import { StateProvider } from '@/atoms/state-provider';

function Probe() {
  const site = useAtomValue(activeSiteAtom);
  const t = useAtomValue(timeStepAtom);
  const layers = useAtomValue(visibleLayersAtom);
  return (
    <span data-testid="probe">
      {site}|{t}|{layers.join(',')}
    </span>
  );
}

describe('REQ-SM-008 — StateProvider seeds atoms with initialValues', () => {
  it('hydrates atoms from props before children render', () => {
    render(
      <StateProvider
        initialValues={{
          site: 'placencia',
          timeStep: 5,
          visibleLayers: ['marine-coral', 'erosion-risk'],
        }}
      >
        <Probe />
      </StateProvider>,
    );
    expect(screen.getByTestId('probe')).toHaveTextContent(
      'placencia|5|marine-coral,erosion-risk',
    );
  });

  it('falls back to atom defaults when props are absent', () => {
    render(
      <StateProvider initialValues={{}}>
        <Probe />
      </StateProvider>,
    );
    // activeSiteAtom default is null → renders empty before |
    expect(screen.getByTestId('probe')).toHaveTextContent('|0|');
  });
});
