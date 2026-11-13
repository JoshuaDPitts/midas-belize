'use client';
import { useEffect, useRef } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import {
  activeSiteAtom,
  coastalEncodingAtom,
  coastalAutoEncodingAtom,
  type CoastalEncodingMode,
} from '@/atoms';
import type { SiteId } from '@/lib/map/core/constants';
import { VulnerabilityRanking } from './VulnerabilityRanking';
import { MangroveUrbanTrend } from './MangroveUrbanTrend';
import { UrbanEncroachmentBars } from './UrbanEncroachmentBars';
import { ScenarioPicker } from './ScenarioPicker';
import { ScenarioImpactCards } from './ScenarioImpactCards';
import styles from './CoastalDomainContent.module.css';

// ---------------------------------------------------------------------------
// Offshore empty state (Laughing Bird Caye)
// ---------------------------------------------------------------------------
function OffshoreEmptyState() {
  const setActiveSite = useSetAtom(activeSiteAtom);
  return (
    <div data-testid="coastal-empty-offshore" className={styles.emptyState}>
      <div className={styles.emptyHeading}>No coastal zone here</div>
      <p className={styles.emptyBody}>
        Laughing Bird Caye has no coastal zone. Coastal processes affecting
        this reef originate in Placencia.
      </p>
      <button
        type="button"
        className={styles.emptyCta}
        aria-label="View Placencia coastal analysis"
        onClick={() => setActiveSite('placencia')}
      >
        View Placencia coastal analysis →
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Partial-data empty state (Caye Caulker sections 2 & 3)
// ---------------------------------------------------------------------------
function PartialDataEmptyState() {
  return (
    <div className={styles.partialEmpty}>
      <p className={styles.partialEmptyText}>
        Coastal model data is not yet available for Caye Caulker. Placencia has
        the full coastal analysis.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function CoastalDomainContent() {
  const activeSite = useAtomValue(activeSiteAtom) as SiteId | null;
  const setEncoding = useSetAtom(coastalEncodingAtom);
  const autoEncodingRef = useRef<boolean>(true);

  // Keep a ref so the IntersectionObserver callback (created once) can always
  // read the latest value without being recreated on every atom change.
  const autoEncoding = useAtomValue(coastalAutoEncodingAtom);
  useEffect(() => {
    autoEncodingRef.current = autoEncoding;
  }, [autoEncoding]);

  const sentinelVulnerabilityRef = useRef<HTMLDivElement>(null);
  const sentinelMangroveRef = useRef<HTMLDivElement>(null);
  const sentinelScenarioDeltaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const nodes = [
      sentinelVulnerabilityRef.current,
      sentinelMangroveRef.current,
      sentinelScenarioDeltaRef.current,
    ].filter(Boolean) as HTMLDivElement[];

    if (nodes.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!autoEncodingRef.current) return;
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const encoding = (entry.target as HTMLElement).dataset
              .encoding as CoastalEncodingMode | undefined;
            if (encoding) {
              setEncoding(encoding);
            }
          }
        }
      },
      { threshold: 0.3 },
    );

    nodes.forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, [setEncoding]);

  // Offshore site — replace everything
  if (activeSite === 'laughing-bird') {
    return (
      <div className={styles.root}>
        <OffshoreEmptyState />
      </div>
    );
  }

  const isCayeCaulker = activeSite === 'caye-caulker';

  return (
    <div className={styles.root} data-testid="coastal-domain-content">
      {/* Section 1 — Vulnerability */}
      <section className={styles.section}>
        <h2 className={styles.sectionHeading}>
          Where is the coast most vulnerable?
        </h2>
        <div
          ref={sentinelVulnerabilityRef}
          data-encoding="vulnerability"
          className={styles.sentinel}
          aria-hidden="true"
        />
        <VulnerabilityRanking site={activeSite} />
      </section>

      {/* Section 2 — Mangrove history */}
      <section className={styles.section}>
        <h2 className={styles.sectionHeading}>How did it get this way?</h2>
        <div
          ref={sentinelMangroveRef}
          data-encoding="mangrove"
          className={styles.sentinel}
          aria-hidden="true"
        />
        {isCayeCaulker ? (
          <PartialDataEmptyState />
        ) : (
          <>
            <MangroveUrbanTrend site={activeSite} />
            <UrbanEncroachmentBars site={activeSite} />
          </>
        )}
      </section>

      {/* Section 3 — Scenario delta */}
      <section className={styles.section}>
        <h2 className={styles.sectionHeading}>What can we do?</h2>
        <div
          ref={sentinelScenarioDeltaRef}
          data-encoding="scenario-delta"
          className={styles.sentinel}
          aria-hidden="true"
        />
        {isCayeCaulker ? (
          <PartialDataEmptyState />
        ) : (
          <>
            <ScenarioPicker />
            <ScenarioImpactCards site={activeSite} />
          </>
        )}
      </section>
    </div>
  );
}
