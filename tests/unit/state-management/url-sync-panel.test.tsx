import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider, createStore, useAtom } from 'jotai';
import { NuqsTestingAdapter } from 'nuqs/adapters/testing';
import { sidebarPanelAtom } from '@/atoms';
import { useSidebarPanelUrlSync } from '@/atoms/url-sync';
import { panelParser } from '@/atoms/url-parsers';

function Probe() {
  useSidebarPanelUrlSync();
  const [p, setP] = useAtom(sidebarPanelAtom);
  return (
    <>
      <span data-testid="panel">{p ?? 'null'}</span>
      <button onClick={() => setP('inspect')}>inspect</button>
    </>
  );
}

describe('REQ-LS-004 — panelParser', () => {
  it('parses the 4 valid panel literals', () => {
    expect(panelParser.parse('layers')).toBe('layers');
    expect(panelParser.parse('inspect')).toBe('inspect');
    expect(panelParser.parse('scenarios')).toBe('scenarios');
    expect(panelParser.parse('domain')).toBe('domain');
  });

  it('rejects everything else', () => {
    expect(panelParser.parse('garbage')).toBeNull();
    expect(panelParser.parse('')).toBeNull();
    expect(panelParser.parse(null)).toBeNull();
  });

  it('serialize round-trips', () => {
    expect(panelParser.serialize('layers')).toBe('layers');
    expect(panelParser.serialize(null)).toBe('');
  });
});

describe('REQ-LS-004 — useSidebarPanelUrlSync', () => {
  beforeEach(() => window.history.replaceState({}, '', '/'));

  it('writes ?panel= via replaceState on atom change', async () => {
    const user = userEvent.setup();
    const captured: { params: URLSearchParams | null; mode: string | undefined } = {
      params: null,
      mode: undefined,
    };
    render(
      <Provider store={createStore()}>
        <NuqsTestingAdapter
          onUrlUpdate={(e) => {
            captured.params = e.searchParams;
            captured.mode = e.options.history;
          }}
        >
          <Probe />
        </NuqsTestingAdapter>
      </Provider>,
    );
    await user.click(screen.getByRole('button'));
    expect(captured.params?.get('panel')).toBe('inspect');
    expect(captured.mode).toBe('replace');
  });

  it('reads ?panel=layers into the atom on mount', () => {
    render(
      <Provider store={createStore()}>
        <NuqsTestingAdapter searchParams="?panel=layers">
          <Probe />
        </NuqsTestingAdapter>
      </Provider>,
    );
    expect(screen.getByTestId('panel')).toHaveTextContent('layers');
  });
});
