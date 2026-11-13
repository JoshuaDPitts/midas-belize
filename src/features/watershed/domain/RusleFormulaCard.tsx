'use client';
import { useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { activeSiteAtom, selectedPolygonAtom } from '@/atoms';
import { useWatershedsForSite } from '@/lib/data';
import { FormulaTooltip } from '@/components/ui/FormulaTooltip';
import { findWatershedFeature, polygonKeyOf } from '../data/findWatershedFeature';
import styles from './RusleFormulaCard.module.css';

type FactorKey = 'R' | 'K' | 'LS' | 'C' | 'P';

interface FactorDef {
  key: FactorKey;
  label: string;
  unit: string;
  description: string;
  propertyName: string;
  source: { citation: string; note: string };
}

const FACTORS: FactorDef[] = [
  {
    key: 'R',
    label: 'Rainfall erosivity',
    unit: 'MJ·mm·ha⁻¹·h⁻¹·yr⁻¹',
    description: 'Energy and intensity of rainfall events driving particle detachment.',
    propertyName: 'mean_r_factor',
    source: {
      citation: 'Renard et al. 1997, RUSLE Handbook',
      note: 'Derived from CHIRPS daily precipitation, 1991–2020 climatology.',
    },
  },
  {
    key: 'K',
    label: 'Soil erodibility',
    unit: 't·ha·h·ha⁻¹·MJ⁻¹·mm⁻¹',
    description: 'Intrinsic susceptibility of the soil to detachment per unit rainfall energy.',
    propertyName: 'K_factor',
    source: {
      citation: 'Wischmeier & Smith 1978',
      note: 'Joined per polygon from FAO Harmonized World Soil Database (sand/silt/clay/OC).',
    },
  },
  {
    key: 'LS',
    label: 'Slope length × steepness',
    unit: 'dimensionless',
    description: 'Topographic factor combining slope length and gradient.',
    propertyName: 'LS_factor',
    source: {
      citation: 'McCool et al. 1987, 1989',
      note: 'Computed from 30 m SRTM DEM via Belize-wide hydrology.',
    },
  },
  {
    key: 'C',
    label: 'Cover management',
    unit: 'dimensionless',
    description: 'Effect of vegetation, residue, and management on soil loss.',
    propertyName: 'C_factor',
    source: {
      citation: 'Renard et al. 1997',
      note: 'Land-cover class to C-factor lookup; needs content review by domain lead.',
    },
  },
  {
    key: 'P',
    label: 'Support practice',
    unit: 'dimensionless',
    description: 'Effectiveness of erosion-control practices (contouring, terracing).',
    propertyName: 'P_factor',
    source: {
      citation: 'USDA-ARS RUSLE 2',
      note: 'Defaults to 1 for unmanaged watersheds; override per scenario.',
    },
  },
];

function formatValue(v: unknown): string | null {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null;
  if (Math.abs(v) >= 1000) return v.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (Math.abs(v) >= 10) return v.toFixed(1);
  return v.toFixed(2);
}

export function RusleFormulaCard() {
  const site = useAtomValue(activeSiteAtom);
  const selected = useAtomValue(selectedPolygonAtom);
  const { geometry, joinedAttrs } = useWatershedsForSite(site);

  const selectedProps = useMemo<Record<string, unknown> | null>(() => {
    if (!selected) return null;
    const feature = findWatershedFeature(
      geometry,
      [joinedAttrs?.nbs, joinedAttrs?.rusle],
      selected.featureId,
    );
    return feature ? ((feature.properties ?? {}) as Record<string, unknown>) : null;
  }, [geometry, joinedAttrs, selected]);

  const subjectLabel = selectedProps
    ? String(polygonKeyOf(selectedProps) ?? 'Selected watershed')
    : 'Site aggregate';
  const hasAnyFactor = selectedProps
    ? FACTORS.some((f) => formatValue(selectedProps[f.propertyName]) !== null)
    : false;

  return (
    <section
      id="watershed-rusle-card"
      className={styles.card}
      data-testid="watershed-rusle-card"
      aria-label="RUSLE soil-loss formula"
    >
      <header className={styles.header}>
        <div>
          <h3 className={styles.title}>Soil-loss formula</h3>
          <p className={styles.subject}>{subjectLabel}</p>
        </div>
        <div className={styles.formulaWrap}>
          <div className={styles.formula} aria-label="A equals R times K times L S times C times P">
            <span className={styles.formulaOut}>A</span>
            <span className={styles.formulaEq}>=</span>
            <span className={styles.formulaFactor}>R</span>
            <span className={styles.formulaOp}>×</span>
            <span className={styles.formulaFactor}>K</span>
            <span className={styles.formulaOp}>×</span>
            <span className={styles.formulaFactor}>LS</span>
            <span className={styles.formulaOp}>×</span>
            <span className={styles.formulaFactor}>C</span>
            <span className={styles.formulaOp}>×</span>
            <span className={styles.formulaFactor}>P</span>
          </div>
          <FormulaTooltip
            label="RUSLE soil loss"
            formula="A = R × K × LS × C × P"
            explanation="Revised Universal Soil Loss Equation. A is annual soil loss (t/ha/yr). Expand each factor below for its source citation and provenance."
          />
        </div>
      </header>
      {selectedProps && !hasAnyFactor && (
        <p className={styles.joinNotice}>
          RUSLE factor data is not joined for this watershed yet. Soil-loss values appear here only where the R, K, LS, C, and P factor join exists for the selected watershed.
        </p>
      )}
      <div className={styles.grid}>
        {FACTORS.map((f) => (
          <FactorCard
            key={f.key}
            def={f}
            rawValue={selectedProps ? selectedProps[f.propertyName] : undefined}
            polygonSelected={!!selectedProps}
          />
        ))}
      </div>
    </section>
  );
}

interface FactorCardProps {
  def: FactorDef;
  rawValue: unknown;
  polygonSelected: boolean;
}

function FactorCard({ def, rawValue, polygonSelected }: FactorCardProps) {
  const value = formatValue(rawValue);
  return (
    <details className={styles.factor} data-testid={`rusle-factor-${def.key}`}>
      <summary
        className={styles.summary}
        aria-label={`${def.key}: ${def.label}. ${
          value !== null ? `${value} ${def.unit}` : polygonSelected ? 'No joined factor data' : 'Select a watershed first'
        }`}
      >
        <span className={styles.factorKey} aria-hidden>
          {def.key}
        </span>
        <span className={styles.factorBody}>
          <span className={styles.factorLabel}>{def.label}</span>
          <span className={styles.factorValue}>
            {value !== null ? (
              <>
                <span>{value}</span>
                <span className={styles.factorUnit}>{def.unit}</span>
              </>
            ) : (
              <span className={styles.placeholder}>
                {polygonSelected ? 'No joined factor data' : 'Select a watershed first'}
              </span>
            )}
          </span>
        </span>
      </summary>
      <div className={styles.detail}>
        <p className={styles.factorDescription}>{def.description}</p>
        <dl className={styles.source} data-testid={`rusle-source-${def.key}`}>
          <dt>Source</dt>
          <dd>{def.source.citation}</dd>
          <dt>Provenance</dt>
          <dd>{def.source.note}</dd>
        </dl>
      </div>
    </details>
  );
}
