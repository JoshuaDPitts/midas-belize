import { useAtomValue } from 'jotai';
import Link from 'next/link';
import { activeSiteAtom, activeScenarioAtom } from '@/atoms';
import type { DomainAvailability } from '../data/useScenarioAvailability';
import { ScenarioMatrix } from './ScenarioMatrix';
import { MarineOutlookGroup } from './MarineOutlookGroup';
import { ClimateRestorationSelector } from '@/features/marine/domain/ClimateRestorationSelector';
import { CoralSpeciesSelector } from '@/features/marine/domain/CoralSpeciesSelector';
import { BiomassYearControls } from '@/features/marine/domain/BiomassYearControls';
import { CoralBiomassChart } from '@/features/marine/domain/CoralBiomassChart';
import styles from './ScenariosPanel.module.css';

export interface DomainAvailabilityInfo {
  status: DomainAvailability;
  publishedDatasets: string[];
  partialDatasets: string[];
  missingVariables: string[];
}

export interface ScenarioAvailabilityData {
  marine: DomainAvailabilityInfo;
  watershed: DomainAvailabilityInfo;
  coastal: DomainAvailabilityInfo;
}

interface ScenariosPanelProps {
  availability: Record<string, ScenarioAvailabilityData>;
}

export function ScenariosPanel({ availability }: ScenariosPanelProps) {
  const activeSite = useAtomValue(activeSiteAtom);
  const activeScenario = useAtomValue(activeScenarioAtom);

  // Empty state when no site selected
  if (!activeSite) {
    return (
      <div className={styles.panel} data-testid="scenarios-panel">
        <div className={styles.emptyState}>
          <p>Pick a site to see scenarios.</p>
        </div>
      </div>
    );
  }

  // Build Compare CTA link with current state
  const scenarioA = activeScenario || 'basecase';
  const compareHref = `/compare?a=${scenarioA}&b=G&v=coastal&mode=diff&site=${activeSite}`;

  const isLaughingBird = activeSite === 'laughing-bird';

  return (
    <div className={styles.panel} data-testid="scenarios-panel">
      <header className={styles.header}>
        <div className={styles.eyebrow}>Scenarios</div>
        <p className={styles.subtitle}>
          {isLaughingBird
            ? 'Pick a climate x restoration scenario; watch coral biomass evolve across the reef.'
            : 'Pick a scenario; explore impacts across the map.'}
        </p>
      </header>

      {isLaughingBird ? (
        <>
          <section className={styles.coralSection} aria-labelledby="coral-biomass-heading">
            <h3 id="coral-biomass-heading" className={styles.coralHeading}>
              Coral biomass scenarios
            </h3>
            <ClimateRestorationSelector />
            <p className={styles.restorationNote} data-testid="restoration-note">
              <span className={styles.restorationNoteLabel}>Restoration plan</span>
              Coral (Acropora palmata) is currently planted at reef polygons{' '}
              <strong>5</strong> and <strong>38</strong>{' '}only, so the
              {' '}&ldquo;Restoration&rdquo; scenarios differ from{' '}
              &ldquo;No restoration&rdquo; at just those two sites.
            </p>
            <CoralSpeciesSelector />
            <BiomassYearControls />
            <CoralBiomassChart />
          </section>

          <details className={styles.regionalExpander} data-testid="regional-scenarios-expander">
            <summary className={styles.regionalSummary}>
              Regional scenarios (coastal / watershed)
            </summary>
            <div className={styles.regionalBody}>
              <ScenarioMatrix availability={availability} />
              <MarineOutlookGroup availability={availability} />
            </div>
          </details>
        </>
      ) : (
        <>
          <ScenarioMatrix availability={availability} />
          <MarineOutlookGroup availability={availability} />
        </>
      )}

      <Link href={compareHref} className={styles.compareCta}>
        Compare scenarios →
      </Link>
    </div>
  );
}
