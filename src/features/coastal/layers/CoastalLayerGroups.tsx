import type { SiteId } from '@/lib/data';
import type { LayerGroupSpec } from '@/features/_types';

export function buildCoastalLayerGroups(activeSite: SiteId | null): LayerGroupSpec[] {
  if (activeSite === 'laughing-bird') return [];

  if (activeSite === 'placencia') {
    return [
      {
        id: 'coastal-placencia-lores',
        label: 'Placencia Coastal (lo-res)',
        layerIds: [
          'placencia-coast-polygons',
          'placencia-coast-nbs-scores',
          'placencia-coast-ebin-clade-detail',
          'coastal-placencia-lowres-poly-attributes',
          'coastal-placencia-lowres-lu-by-ebin',
          'coastal-placencia-lowres-fetch-by-wd',
          'coastal-placencia-lowres-poly-connections',
          'coastal-placencia-lowres-outside-sediments',
        ],
        order: 40,
      },
      {
        id: 'coastal-placencia-hires',
        label: 'Placencia Coastal (hi-res 30-poly)',
        layerIds: [
          'placencia-30polygons-shape',
          'coastal-placencia-hires-urban-ratio',
          'coastal-placencia-hires-fetch30bywd8',
          'coastal-placencia-hires-pl-erosion',
          'coastal-placencia-hires-elev-bins-attributes-16',
          'coastal-placencia-hires-poly-connections-30',
        ],
        order: 41,
      },
    ];
  }

  if (activeSite === 'caye-caulker') {
    return [
      {
        id: 'coastal-cayecaulker',
        label: 'Caye Caulker Coastal',
        layerIds: [
          'cayecaulker-coast-polygons',
          'cayecaulker-coast-nbs-scores',
          'cayecaulker-coast-ebin-clade-detail',
        ],
        order: 40,
      },
    ];
  }

  return [];
}
