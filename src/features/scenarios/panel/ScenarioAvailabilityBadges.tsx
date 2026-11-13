import type { ScenarioId } from '../matrix';
import type { ScenarioAvailabilityData } from './ScenariosPanel';
import styles from './ScenarioAvailabilityBadges.module.css';

interface ScenarioAvailabilityBadgesProps {
  scenarioId: ScenarioId;
  availability: ScenarioAvailabilityData;
}

const DOMAIN_ORDER = ['marine', 'watershed', 'coastal'] as const;
const DOMAIN_LABELS: Record<typeof DOMAIN_ORDER[number], string> = {
  marine: 'Marine',
  watershed: 'Watershed',
  coastal: 'Coastal',
};

function buildTitle(domain: string, status: string, publishedCount: number): string {
  const label = DOMAIN_LABELS[domain as keyof typeof DOMAIN_LABELS];
  if (status === 'published') {
    return `${label}: ${publishedCount} dataset${publishedCount === 1 ? '' : 's'} published`;
  }
  if (status === 'partial') {
    return `${label}: partial data available`;
  }
  return `${label}: missing data`;
}

function buildAriaLabel(scenarioId: ScenarioId, availability: ScenarioAvailabilityData): string {
  const parts: string[] = [`Scenario ${scenarioId} availability:`];
  
  DOMAIN_ORDER.forEach((domain) => {
    const info = availability[domain];
    const label = DOMAIN_LABELS[domain];
    if (info.status === 'published') {
      parts.push(`${label} published (${info.publishedDatasets.length} datasets)`);
    } else if (info.status === 'partial') {
      parts.push(`${label} partial data`);
    } else {
      parts.push(`${label} missing`);
    }
  });
  
  return parts.join(', ');
}

export function ScenarioAvailabilityBadges({
  scenarioId,
  availability,
}: ScenarioAvailabilityBadgesProps) {
  return (
    <div
      className={styles.badges}
      aria-label={buildAriaLabel(scenarioId, availability)}
    >
      {DOMAIN_ORDER.map((domain) => {
        const info = availability[domain];
        const title = buildTitle(domain, info.status, info.publishedDatasets.length);
        
        return (
          <span
            key={domain}
            className={styles.dot}
            data-domain={domain}
            data-status={info.status}
            title={title}
          />
        );
      })}
    </div>
  );
}
