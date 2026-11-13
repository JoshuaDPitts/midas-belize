import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createStore, Provider } from 'jotai';
import { selectionAtom, activeSiteAtom } from '@/atoms';
import { InspectTab } from '@/components/app-shell/panels/InspectTab';

describe('REQ-MC-010: InspectTab selection count', () => {
  it('shows "N selected" when selection has >1 (empty branch)', () => {
    const store = createStore();
    store.set(activeSiteAtom, 'placencia' as never);
    store.set(selectionAtom, new Set(['L:1', 'L:2', 'L:3']));
    render(
      <Provider store={store}>
        <InspectTab />
      </Provider>,
    );
    expect(screen.getByTestId('inspect-selection-count')).toHaveTextContent('3 selected');
  });

  it('does NOT show the count when selection has 0 or 1', () => {
    const store = createStore();
    store.set(activeSiteAtom, 'placencia' as never);
    store.set(selectionAtom, new Set(['L:1']));
    render(
      <Provider store={store}>
        <InspectTab />
      </Provider>,
    );
    expect(screen.queryByTestId('inspect-selection-count')).toBeNull();
  });
});
