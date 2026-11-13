// Canonical Scenario Matrix — single source of truth for what scenarios
// theoretically exist across all verticals. Per spec section 3.

export type ScenarioId = 'basecase' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';
export type MarineOutlookId = 'res' | 'wc' | 'deg';
export type ScenarioGroup = 'reference' | 'urban' | 'slr';
export type ScenarioAxisLevel =
  | 'Base' | 'High'
  | '10' | '20' | '40' | '60' | '10M+'
  | 'ER1' | 'ER2' | 'ER3' | 'ER4';

export interface ScenarioDef {
  id: ScenarioId;
  name: string;
  shortLabel: string;
  description: string;
  group: ScenarioGroup;
  axes: { erosion: ScenarioAxisLevel; slr: ScenarioAxisLevel; urban: ScenarioAxisLevel };
}

export interface MarineOutlookDef {
  id: MarineOutlookId;
  name: string;
  shortLabel: string;
  description: string;
}

export const SCENARIOS: readonly ScenarioDef[] = [
  {
    id: 'basecase', name: 'Base Case', shortLabel: 'Base',
    description: 'Reference state with no scenario perturbations applied.',
    group: 'reference',
    axes: { erosion: 'Base', slr: 'Base', urban: 'Base' },
  },
  {
    id: 'G', name: 'Moderate Urban, Baseline SLR', shortLabel: 'G',
    description: 'Moderate urbanization (20%) under baseline sea-level rise.',
    group: 'urban',
    axes: { erosion: 'Base', slr: 'Base', urban: '20' },
  },
  {
    id: 'B', name: 'Extreme Urbanization', shortLabel: 'B',
    description: 'Extreme urbanization (60%) under baseline sea-level rise.',
    group: 'urban',
    axes: { erosion: 'Base', slr: 'Base', urban: '60' },
  },
  {
    id: 'F', name: 'Low Urban, High SLR', shortLabel: 'F',
    description: 'Baseline urbanization under high sea-level rise with ER1 erosion.',
    group: 'slr',
    axes: { erosion: 'ER1', slr: 'High', urban: 'Base' },
  },
  {
    id: 'C', name: 'Managed Watersheds Under High SLR', shortLabel: 'C',
    description: 'Watershed management interventions under high SLR (10% urban, ER2).',
    group: 'slr',
    axes: { erosion: 'ER2', slr: 'High', urban: '10' },
  },
  {
    id: 'D', name: 'Mangrove Pressure', shortLabel: 'D',
    description: 'Mangrove stress under high SLR with managed urbanization (ER3, 10M+).',
    group: 'slr',
    axes: { erosion: 'ER3', slr: 'High', urban: '10M+' },
  },
  {
    id: 'E', name: 'Double-Peak Shock', shortLabel: 'E',
    description: 'Compound erosion shock (ER4) under high SLR with moderate urban (20%).',
    group: 'slr',
    axes: { erosion: 'ER4', slr: 'High', urban: '20' },
  },
  {
    id: 'A', name: 'Hard Development & High SLR', shortLabel: 'A',
    description: 'Hard-development urbanization (40%) under high SLR with ER1 erosion.',
    group: 'slr',
    axes: { erosion: 'ER1', slr: 'High', urban: '40' },
  },
] as const;

export const MARINE_OUTLOOK_SCENARIOS: readonly MarineOutlookDef[] = [
  { id: 'res', name: 'Restoration outlook',    shortLabel: 'Restoration',  description: 'Marine restoration scenario outcomes.' },
  { id: 'wc',  name: 'Worst-case outlook',     shortLabel: 'Worst-case',   description: 'Worst-case marine projection.' },
  { id: 'deg', name: 'Degradation outlook',    shortLabel: 'Degradation',  description: 'Marine degradation projection.' },
] as const;

const SCENARIO_MAP = new Map(SCENARIOS.map((s) => [s.id, s]));

export function getScenario(id: ScenarioId): ScenarioDef {
  const def = SCENARIO_MAP.get(id);
  if (!def) throw new Error(`Unknown scenario id: ${id}`);
  return def;
}

export function getScenariosByGroup(group: ScenarioGroup): ScenarioDef[] {
  return SCENARIOS.filter((s) => s.group === group);
}

const VALID_IDS: Set<string> = new Set(SCENARIOS.map((s) => s.id as string));

export function isValidScenarioId(s: unknown): s is ScenarioId {
  return typeof s === 'string' && VALID_IDS.has(s);
}
