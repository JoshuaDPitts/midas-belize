/** Use-case presets for the NbS priority ranking. Each preset atomically
 * overrides the per-factor weight vector to favour a specific intervention
 * goal. Picking a preset just sets `nbsRankWeightsAtom`; users can then
 * tweak individual sliders without losing the preset's baseline.
 *
 * The three presets are content-review-pending — they're a starting point
 * that the implementing agent can refine with the domain team. */

export interface NbsPreset {
  id: string;
  label: string;
  description: string;
  weights: Record<string, number>;
}

export const NBS_PRESETS: NbsPreset[] = [
  {
    id: 'biodiversity',
    label: 'Biodiversity',
    description:
      'Favours watersheds with rich clade diversity and high conservation value, lighter weight on raw area or rainfall.',
    weights: {
      'restoration-potential': 0.6,
      'conservation-value': 1.2,
      'area': 0.3,
      'r-factor': 0.3,
      'suitable-elev': 0.4,
      'mangrove-gap': 0.6,
      'downstream-sediment': 0.3,
      'scenario-uplift': 0.3,
      'clade-biodiversity': 1.5,
    },
  },
  {
    id: 'coral-protection',
    label: 'Coral protection',
    description:
      'Favours upstream watersheds whose sediment yield reaches reef receiving waters: high R-factor + high downstream-sediment delivery.',
    weights: {
      'restoration-potential': 0.8,
      'conservation-value': 0.6,
      'area': 0.5,
      'r-factor': 1.2,
      'suitable-elev': 0.4,
      'mangrove-gap': 0.5,
      'downstream-sediment': 1.5,
      'scenario-uplift': 0.6,
      'clade-biodiversity': 0.3,
    },
  },
  {
    id: 'area-coverage',
    label: 'Area coverage',
    description:
      'Maximises restorable hectares per ranking slot: large polygons with high restoration potential and physically suitable elevation.',
    weights: {
      'restoration-potential': 1.2,
      'conservation-value': 0.5,
      'area': 1.2,
      'r-factor': 0.3,
      'suitable-elev': 1.0,
      'mangrove-gap': 0.8,
      'downstream-sediment': 0.3,
      'scenario-uplift': 0.3,
      'clade-biodiversity': 0.3,
    },
  },
];

export function getPresetById(id: string): NbsPreset | undefined {
  return NBS_PRESETS.find((p) => p.id === id);
}
