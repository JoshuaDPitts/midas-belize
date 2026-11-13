import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useAtom } from 'jotai';
import { NuqsTestingAdapter } from 'nuqs/adapters/testing';
import {
  activeScenarioAtom,
  compareScenarioBAtom,
  compareVerticalAtom,
  compareLayoutModeAtom,
} from '@/atoms';
import {
  useCompareScenarioAUrlSync,
  useCompareScenarioBUrlSync,
  useCompareVerticalUrlSync,
  useCompareLayoutModeUrlSync,
  useCompareUrlSyncProvider,
} from '@/atoms/url-sync';
import type { ScenarioId } from '@/features/scenarios/matrix';

beforeEach(() => {
  window.history.replaceState({}, '', '/');
});

function ScenarioAProbe() {
  useCompareScenarioAUrlSync();
  const [a, setA] = useAtom(activeScenarioAtom);
  return (
    <>
      <span data-testid="scenarioA">{a ?? 'none'}</span>
      <button onClick={() => setA('D' as ScenarioId)}>Set D</button>
    </>
  );
}

function ScenarioBProbe() {
  useCompareScenarioBUrlSync();
  const [b, setB] = useAtom(compareScenarioBAtom);
  return (
    <>
      <span data-testid="scenarioB">{b ?? 'none'}</span>
      <button onClick={() => setB('G' as ScenarioId)}>Set G</button>
    </>
  );
}

function VerticalProbe() {
  useCompareVerticalUrlSync();
  const [v, setV] = useAtom(compareVerticalAtom);
  return (
    <>
      <span data-testid="vertical">{v}</span>
      <button onClick={() => setV('watershed')}>Set Watershed</button>
    </>
  );
}

function LayoutModeProbe() {
  useCompareLayoutModeUrlSync();
  const [mode, setMode] = useAtom(compareLayoutModeAtom);
  return (
    <>
      <span data-testid="mode">{mode}</span>
      <button onClick={() => setMode('swipe')}>Set Swipe</button>
    </>
  );
}

function ProviderProbe() {
  useCompareUrlSyncProvider();
  const [a] = useAtom(activeScenarioAtom);
  const [b] = useAtom(compareScenarioBAtom);
  const [v] = useAtom(compareVerticalAtom);
  const [mode] = useAtom(compareLayoutModeAtom);
  return (
    <span data-testid="all">
      {a ?? 'none'}|{b ?? 'none'}|{v}|{mode}
    </span>
  );
}

describe('REQ-SC-018: Compare URL sync hooks', () => {
  it('useCompareScenarioAUrlSync reads ?a=B from URL on mount and writes to activeScenarioAtom', () => {
    render(
      <NuqsTestingAdapter searchParams="?a=B">
        <ScenarioAProbe />
      </NuqsTestingAdapter>,
    );
    expect(screen.getByTestId('scenarioA')).toHaveTextContent('B');
  });

  it('setting activeScenarioAtom updates the URL to ?a={id}', async () => {
    const user = userEvent.setup();
    const captured: { params: URLSearchParams | null } = { params: null };
    render(
      <NuqsTestingAdapter onUrlUpdate={(e) => { captured.params = e.searchParams; }}>
        <ScenarioAProbe />
      </NuqsTestingAdapter>,
    );
    await user.click(screen.getByRole('button'));
    expect(captured.params?.get('a')).toBe('D');
  });

  it('useCompareScenarioBUrlSync reads ?b=G from URL on mount and writes to compareScenarioBAtom', () => {
    render(
      <NuqsTestingAdapter searchParams="?b=G">
        <ScenarioBProbe />
      </NuqsTestingAdapter>,
    );
    expect(screen.getByTestId('scenarioB')).toHaveTextContent('G');
  });

  it('setting compareScenarioBAtom updates the URL to ?b={id}', async () => {
    const user = userEvent.setup();
    const captured: { params: URLSearchParams | null } = { params: null };
    render(
      <NuqsTestingAdapter onUrlUpdate={(e) => { captured.params = e.searchParams; }}>
        <ScenarioBProbe />
      </NuqsTestingAdapter>,
    );
    await user.click(screen.getByRole('button'));
    expect(captured.params?.get('b')).toBe('G');
  });

  it('useCompareVerticalUrlSync handles ?v=watershed correctly', () => {
    render(
      <NuqsTestingAdapter searchParams="?v=watershed">
        <VerticalProbe />
      </NuqsTestingAdapter>,
    );
    expect(screen.getByTestId('vertical')).toHaveTextContent('watershed');
  });

  it('useCompareLayoutModeUrlSync reads ?mode=swipe from URL', () => {
    // Test that explicit mode values are read correctly
    render(
      <NuqsTestingAdapter searchParams="?mode=swipe">
        <LayoutModeProbe />
      </NuqsTestingAdapter>,
    );
    expect(screen.getByTestId('mode')).toHaveTextContent('swipe');
  });

  it('invalid URL values fall back to defaults (no atom write)', () => {
    // Invalid vertical value should fall back to 'coastal'
    render(
      <NuqsTestingAdapter searchParams="?v=foobar">
        <VerticalProbe />
      </NuqsTestingAdapter>,
    );
    expect(screen.getByTestId('vertical')).toHaveTextContent('coastal');
  });

  it('useCompareUrlSyncProvider mounts all four hooks', () => {
    render(
      <NuqsTestingAdapter searchParams="?a=C&b=B&v=marine&mode=swipe">
        <ProviderProbe />
      </NuqsTestingAdapter>,
    );
    expect(screen.getByTestId('all')).toHaveTextContent('C|B|marine|swipe');
  });
});
