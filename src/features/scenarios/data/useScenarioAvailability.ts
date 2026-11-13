'use client';
import { useMemo } from 'react';
import { useLayersForSite } from '@/lib/data';
import type { SiteId } from '@/lib/data/types';
import type { ScenarioId, MarineOutlookId } from '@/features/scenarios/matrix';

export type DomainName = 'marine' | 'watershed' | 'coastal';
export type DomainAvailability = 'published' | 'partial' | 'missing';

export interface ScenarioAvailability {
  scenarioId: ScenarioId | MarineOutlookId;
  domains: { marine: DomainAvailability; watershed: DomainAvailability; coastal: DomainAvailability };
  publishedDatasets: string[];
}

export const EXPECTED_VARIABLES: Record<DomainName, readonly string[]> = {
  marine: ['wave', 'foodweb'],
  watershed: ['erosion', 'landcover', 'mangroves'],
  coastal: ['wave', 'erosion', 'landcover', 'ecosys-services'],
} as const;

const SCENARIO_ALIAS: Record<string, ScenarioId | MarineOutlookId> = {
  bc: 'basecase',
  basecase: 'basecase',
  A: 'A', B: 'B', C: 'C', D: 'D', E: 'E', F: 'F', G: 'G',
  res: 'res', wc: 'wc', deg: 'deg',
};

const DOMAIN_ALIAS: Record<string, DomainName> = {
  coast: 'coastal',
  marine: 'marine',
  watershed: 'watershed',
};

// Pattern: output-{domain}-{site|placencia|cayecaulker|lb|all}-(hires|lores|.)?-{variable}-{scenarioCode}
// Also supports older flat form: output-{domain}-{variable}-{scenarioCode}
const DATASET_RE = /^output-([a-z]+)-(?:([a-z-]+?)-)?(?:(hires|lores)-)?([a-z-]+?)-([A-Za-z]+)$/;

export interface ParsedDataset {
  domain: DomainName;
  site: string | null;
  resolution: 'hires' | 'lores' | null;
  variable: string;
  scenarioCode: ScenarioId | MarineOutlookId;
}

export function parseDatasetId(id: string): ParsedDataset | null {
  const m = DATASET_RE.exec(id);
  if (!m) return null;
  const [, rawDomain, rawSite, rawRes, variable, rawScenario] = m;
  const domain = DOMAIN_ALIAS[rawDomain];
  if (!domain) return null;
  const scenarioCode = SCENARIO_ALIAS[rawScenario];
  if (!scenarioCode) return null;
  return {
    domain,
    site: rawSite ?? null,
    resolution: (rawRes as 'hires' | 'lores') ?? null,
    variable,
    scenarioCode,
  };
}

export function classifyAvailability(
  presentVariables: readonly string[],
  domain: DomainName,
): DomainAvailability {
  const expected = EXPECTED_VARIABLES[domain];
  if (presentVariables.length === 0) return 'missing';
  const have = new Set(presentVariables);
  const haveCount = expected.filter((v) => have.has(v)).length;
  if (haveCount === expected.length) return 'published';
  if (haveCount > 0) return 'partial';
  // Variables present but not in the expected list — still counts as partial
  return 'partial';
}

export function useScenarioAvailability(site: SiteId | null): {
  byScenario: Map<string, ScenarioAvailability>;
  loading: boolean;
} {
  const { layers, loading } = useLayersForSite(site);

  const byScenario = useMemo(() => {
    const map = new Map<string, ScenarioAvailability>();
    // Group parsed datasets by scenarioCode
    const grouped = new Map<string, Map<DomainName, string[]>>();
    for (const layer of layers) {
      const parsed = parseDatasetId(layer.id);
      if (!parsed) continue;
      let perDomain = grouped.get(parsed.scenarioCode);
      if (!perDomain) {
        perDomain = new Map();
        grouped.set(parsed.scenarioCode, perDomain);
      }
      let vars = perDomain.get(parsed.domain);
      if (!vars) {
        vars = [];
        perDomain.set(parsed.domain, vars);
      }
      vars.push(parsed.variable);
    }
    for (const [scenarioCode, perDomain] of grouped) {
      const allDatasets: string[] = [];
      for (const vs of perDomain.values()) allDatasets.push(...vs);
      map.set(scenarioCode, {
        scenarioId: scenarioCode as ScenarioId | MarineOutlookId,
        domains: {
          marine: classifyAvailability(perDomain.get('marine') ?? [], 'marine'),
          watershed: classifyAvailability(perDomain.get('watershed') ?? [], 'watershed'),
          coastal: classifyAvailability(perDomain.get('coastal') ?? [], 'coastal'),
        },
        publishedDatasets: allDatasets,
      });
    }
    return map;
  }, [layers]);

  return { byScenario, loading };
}
