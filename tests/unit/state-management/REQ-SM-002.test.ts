import { describe, it, expect } from 'vitest';
import {
  visibleLayersAtom,
  layerOpacityAtom,
  activeScenarioAtom,
  sidebarPanelAtom,
  type SidebarPanel,
} from '@/atoms';
import { createStore } from 'jotai';

describe('REQ-SM-002 — new base atoms', () => {
  it('visibleLayersAtom defaults to []', () => {
    const store = createStore();
    expect(store.get(visibleLayersAtom)).toEqual([]);
  });

  it('visibleLayersAtom preserves z-order on write', () => {
    const store = createStore();
    store.set(visibleLayersAtom, ['marine-coral', 'erosion-risk']);
    expect(store.get(visibleLayersAtom)).toEqual(['marine-coral', 'erosion-risk']);
  });

  it('layerOpacityAtom defaults to {}', () => {
    const store = createStore();
    expect(store.get(layerOpacityAtom)).toEqual({});
  });

  it('activeScenarioAtom defaults to null', () => {
    const store = createStore();
    expect(store.get(activeScenarioAtom)).toBeNull();
  });

  it('sidebarPanelAtom accepts the 4 documented panel ids', () => {
    const store = createStore();
    const panels: SidebarPanel[] = ['layers', 'inspect', 'scenarios', 'domain'];
    for (const p of panels) {
      store.set(sidebarPanelAtom, p);
      expect(store.get(sidebarPanelAtom)).toBe(p);
    }
    store.set(sidebarPanelAtom, null);
    expect(store.get(sidebarPanelAtom)).toBeNull();
  });
});
