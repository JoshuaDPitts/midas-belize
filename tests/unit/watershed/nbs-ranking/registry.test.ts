import { describe, it, expect, beforeEach } from 'vitest';
import {
  registerFactor,
  getRegisteredFactors,
  clearFactors,
} from '@/features/watershed/domain/nbs-ranking/_register';
import type {
  NbsRankFactor,
  WatershedPolygonContext,
} from '@/features/watershed/domain/nbs-ranking/_types';

function makeFactor(id: string, label = id): NbsRankFactor<WatershedPolygonContext> {
  return {
    id,
    label,
    description: `factor ${id}`,
    defaultWeight: 1,
    direction: 'higher-better',
    compute: () => 1,
  };
}

describe('REQ-WS-018: nbs-ranking registry', () => {
  beforeEach(() => {
    clearFactors();
  });

  it('register + getRegisteredFactors round-trip', () => {
    const f = makeFactor('a');
    registerFactor(f);
    const all = getRegisteredFactors();
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe('a');
  });

  it('preserves insertion order', () => {
    registerFactor(makeFactor('a'));
    registerFactor(makeFactor('b'));
    registerFactor(makeFactor('c'));
    expect(getRegisteredFactors().map((f) => f.id)).toEqual(['a', 'b', 'c']);
  });

  it('re-registering an id replaces the previous entry', () => {
    registerFactor(makeFactor('a', 'first'));
    registerFactor(makeFactor('a', 'second'));
    const all = getRegisteredFactors();
    expect(all).toHaveLength(1);
    expect(all[0].label).toBe('second');
  });

  it('clearFactors empties the registry', () => {
    registerFactor(makeFactor('a'));
    registerFactor(makeFactor('b'));
    clearFactors();
    expect(getRegisteredFactors()).toEqual([]);
  });
});
