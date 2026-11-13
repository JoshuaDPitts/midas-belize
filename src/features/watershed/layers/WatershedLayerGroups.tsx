import type { SiteId } from '@/lib/data';
import type { LayerGroupSpec } from '@/features/_types';

const RFACTOR_MONTHS = [
  'jan', 'feb', 'mar', 'apr', 'may', 'jun',
  'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
] as const;

export function buildWatershedLayerGroups(activeSite: SiteId | null): LayerGroupSpec[] {
  if (activeSite === 'laughing-bird') return [];

  if (activeSite === 'placencia') {
    return [
      {
        id: 'watershed-placencia',
        label: 'Placencia Watersheds',
        layerIds: [
          'placencia-watershed-polygons',
          'placencia-watersheds-nbs-scores',
          'placencia-watersheds-ebin-clade-detail',
        ],
        order: 30,
      },
    ];
  }

  if (activeSite === 'caye-caulker') {
    return [
      {
        id: 'watershed-cayecaulker',
        label: 'Caye Caulker Watersheds',
        layerIds: ['cayecaulker-watershed-polygons'],
        order: 30,
      },
    ];
  }

  return [
    {
      id: 'watershed-national',
      label: 'Belize Watersheds (national)',
      layerIds: [
        'watersheds-utm-shape',
        'watersheds-all-nbs-scores',
        'watersheds-all-ebin-clade-detail',
      ],
      order: 30,
    },
    {
      id: 'rfactor-national',
      label: 'Rainfall Erosivity (R-factor, monthly)',
      layerIds: RFACTOR_MONTHS.map((m) => `rfactor-${m}`),
      order: 31,
    },
  ];
}
