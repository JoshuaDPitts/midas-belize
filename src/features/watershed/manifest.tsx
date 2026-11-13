import type { FeatureManifest } from '@/features/_types';
import { Icon } from '@/lib/icons';
import { WatershedDomainContent } from './domain/WatershedDomainContent';
import { WatershedPolygonFormatter } from './inspect/WatershedPolygonFormatter';
import { WatershedMapLayers } from './map/WatershedMapLayers';
import { WatershedEncoderPicker } from './map/WatershedEncoderPicker';
import { WatershedLegend } from './map/WatershedLegend';
import { ErosionHotspotToggle } from './map/ErosionHotspotToggle';
import { WatershedSwipe } from './map/WatershedSwipe';
import { buildWatershedLayerGroups } from './layers/WatershedLayerGroups';

export const watershedManifest: FeatureManifest = {
  id: 'watershed',
  label: 'Watershed & Erosion',
  icon: <Icon name="watershed" />,
  domainContent: { sublabel: 'Watershed', component: WatershedDomainContent },
  inspectFormatters: {
    'watershed-polygons': WatershedPolygonFormatter,
    'watersheds-utm-shape': WatershedPolygonFormatter,
  },
  mapOverlays: [
    WatershedMapLayers,
    WatershedEncoderPicker,
    WatershedLegend,
    ErosionHotspotToggle,
    WatershedSwipe,
  ],
  layersRowGroup: buildWatershedLayerGroups,
};
