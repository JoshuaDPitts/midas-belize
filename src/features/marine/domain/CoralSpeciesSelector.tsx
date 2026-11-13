'use client';
import { useAtom } from 'jotai';
import { coralSpeciesAtom, type CoralSpecies } from '@/atoms';
import { useCoralBiomass } from './useCoralBiomass';
import styles from './CoralSpeciesSelector.module.css';

interface Option {
  value: CoralSpecies;
  label: string;
  scientific?: string;
}

/**
 * Segmented control switching the coral biomass choropleth between the summed
 * total ('all') and each modelled species (Acropora palmata / Porites lobata /
 * Montastraea cavernosa). Species labels are resolved live from the dataset so
 * this never hardcodes taxonomy. Radiogroup semantics with arrow-key nav,
 * matching ClimateRestorationSelector / EncoderPicker.
 */
export function CoralSpeciesSelector() {
  const [species, setSpecies] = useAtom(coralSpeciesAtom);
  const { speciesList } = useCoralBiomass();

  const options: Option[] = [
    { value: 'all', label: 'All species' },
    ...speciesList.map((s) => ({
      value: s.id as CoralSpecies,
      label: s.name,
      scientific: s.name,
    })),
  ];

  const activeIdx = options.findIndex((o) => o.value === species);

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (!['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
    e.preventDefault();
    const forward = e.key === 'ArrowRight' || e.key === 'ArrowDown';
    const next = forward
      ? (activeIdx + 1) % options.length
      : (activeIdx - 1 + options.length) % options.length;
    setSpecies(options[next].value);
  }

  return (
    <div className={styles.wrapper}>
      <span className={styles.label}>Coral species</span>
      <div
        role="radiogroup"
        aria-label="Coral biomass species"
        className={styles.segments}
        onKeyDown={onKeyDown}
        data-testid="coral-species-selector"
      >
        {options.map((opt) => {
          const active = opt.value === species;
          return (
            <button
              key={String(opt.value)}
              type="button"
              role="radio"
              aria-checked={active}
              data-testid={`coral-species-${opt.value}`}
              className={`${styles.segment} ${active ? styles.segmentActive : ''}`}
              tabIndex={active ? 0 : -1}
              onClick={() => setSpecies(opt.value)}
              title={opt.value === 'all' ? 'Summed biomass of all three species' : opt.scientific}
            >
              <span className={styles.segmentLabel}>{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
