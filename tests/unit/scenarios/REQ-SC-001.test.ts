import { describe, it, expect } from 'vitest';
import {
  SCENARIOS,
  MARINE_OUTLOOK_SCENARIOS,
  getScenario,
  getScenariosByGroup,
  isValidScenarioId,
  type ScenarioId,
} from '@/features/scenarios/matrix';

describe('REQ-SC-001: Canonical scenario matrix', () => {
  it('exports exactly 8 canonical scenarios', () => {
    expect(SCENARIOS).toHaveLength(8);
  });
  it('exports basecase + A..G ids', () => {
    const ids = SCENARIOS.map((s) => s.id);
    expect(ids).toEqual(
      expect.arrayContaining(['basecase', 'A', 'B', 'C', 'D', 'E', 'F', 'G']),
    );
  });
  it('groups: 1 reference, 2 urban, 5 slr', () => {
    expect(getScenariosByGroup('reference')).toHaveLength(1);
    expect(getScenariosByGroup('urban')).toHaveLength(2);
    expect(getScenariosByGroup('slr')).toHaveLength(5);
  });
  it('getScenario returns the matching def', () => {
    expect(getScenario('G').name).toBe('Moderate Urban, Baseline SLR');
  });
  it('isValidScenarioId guards bad input', () => {
    expect(isValidScenarioId('G')).toBe(true);
    expect(isValidScenarioId('Z')).toBe(false);
    expect(isValidScenarioId(null)).toBe(false);
    expect(isValidScenarioId(42)).toBe(false);
  });
  it('MARINE_OUTLOOK_SCENARIOS has res / wc / deg', () => {
    const ids = MARINE_OUTLOOK_SCENARIOS.map((s) => s.id);
    expect(ids).toEqual(['res', 'wc', 'deg']);
  });
});
