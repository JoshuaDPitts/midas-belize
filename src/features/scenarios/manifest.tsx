import type { FeatureManifest } from '@/features/_types';
import { Icon } from '@/lib/icons';
import { useAtomValue } from 'jotai';
import { activeSiteAtom } from '@/atoms';
import { ScenariosPanel } from './panel/ScenariosPanel';
import type { ScenarioAvailabilityData } from './panel/ScenariosPanel';
import { useScenarioAvailability } from './data/useScenarioAvailability';

// Wrapper that provides availability data to ScenariosPanel
function ScenariosContent() {
  const activeSite = useAtomValue(activeSiteAtom);
  const { byScenario, loading } = useScenarioAvailability(activeSite);

  // Transform Map-based data from hook into Record-based format for components
  const availability: Record<string, ScenarioAvailabilityData> = {};
  
  for (const [scenarioId, scenarioAvailability] of byScenario) {
    availability[scenarioId] = {
      marine: {
        status: scenarioAvailability.domains.marine,
        publishedDatasets: scenarioAvailability.domains.marine === 'published' ? scenarioAvailability.publishedDatasets : [],
        partialDatasets: [],
        missingVariables: [],
      },
      watershed: {
        status: scenarioAvailability.domains.watershed,
        publishedDatasets: scenarioAvailability.domains.watershed === 'published' ? scenarioAvailability.publishedDatasets : [],
        partialDatasets: [],
        missingVariables: [],
      },
      coastal: {
        status: scenarioAvailability.domains.coastal,
        publishedDatasets: scenarioAvailability.domains.coastal === 'published' ? scenarioAvailability.publishedDatasets : [],
        partialDatasets: [],
        missingVariables: [],
      },
    };
  }

  return <ScenariosPanel availability={availability} />;
}

export const scenariosManifest: FeatureManifest = {
  id: 'scenarios',
  label: 'Scenarios',
  icon: <Icon name="layers" />,
  scenariosContent: ScenariosContent,
};
