import { describe, it, expect } from 'vitest';
import { createStore } from 'jotai';
import {
  activeScenarioAtom,
  compareScenarioBAtom,
  compareVerticalAtom,
  compareLayoutModeAtom,
} from '@/atoms';

describe('REQ-SC-002: Scenario atoms', () => {
  it('activeScenarioAtom defaults to null', () => {
    const store = createStore();
    expect(store.get(activeScenarioAtom)).toBeNull();
  });
  it('activeScenarioAtom accepts ScenarioId values', () => {
    const store = createStore();
    store.set(activeScenarioAtom, 'G');
    expect(store.get(activeScenarioAtom)).toBe('G');
  });
  it('compareScenarioBAtom defaults to null', () => {
    const store = createStore();
    expect(store.get(compareScenarioBAtom)).toBeNull();
  });
  it('compareVerticalAtom defaults to coastal', () => {
    const store = createStore();
    expect(store.get(compareVerticalAtom)).toBe('coastal');
  });
  it('compareLayoutModeAtom defaults to diff', () => {
    const store = createStore();
    expect(store.get(compareLayoutModeAtom)).toBe('diff');
  });
});
