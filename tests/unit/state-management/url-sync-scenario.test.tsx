import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useAtom } from 'jotai';
import { NuqsTestingAdapter } from 'nuqs/adapters/testing';
import { activeScenarioAtom } from '@/atoms';
import { useScenarioUrlSync } from '@/atoms/url-sync';

function Probe() {
  useScenarioUrlSync();
  const [scenario, setScenario] = useAtom(activeScenarioAtom);
  return (
    <>
      <span data-testid="scenario">{scenario ?? 'none'}</span>
      <button onClick={() => setScenario('basecase')}>Pick basecase</button>
    </>
  );
}

describe('REQ-SM-010 — scenario URL sync', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/');
  });

  it('writes scenario= via replaceState on atom change', async () => {
    const user = userEvent.setup();
    const captured: { params: URLSearchParams | null; mode: string | undefined } = {
      params: null,
      mode: undefined,
    };
    render(
      <NuqsTestingAdapter
        onUrlUpdate={(e) => {
          captured.params = e.searchParams;
          captured.mode = e.options.history;
        }}
      >
        <Probe />
      </NuqsTestingAdapter>,
    );
    await user.click(screen.getByRole('button'));
    expect(captured.params?.get('scenario')).toBe('basecase');
    expect(captured.mode).toBe('replace');
  });

  it('reads ?scenario= into the atom on mount', () => {
    render(
      <NuqsTestingAdapter searchParams="?scenario=G">
        <Probe />
      </NuqsTestingAdapter>,
    );
    expect(screen.getByTestId('scenario')).toHaveTextContent('G');
  });
});
