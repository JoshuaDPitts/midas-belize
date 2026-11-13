import type { FeatureManifest } from '@/features/_types';
import { Icon } from '@/lib/icons';
import { CoastalMapLayers } from './map/CoastalMapLayers';
import { CoastalEncoderPicker } from './map/CoastalEncoderPicker';
import { CoastalLegend } from './map/CoastalLegend';
import { CoastalResolutionToggle } from './map/CoastalResolutionToggle';
import { CoastalPolygonFormatter } from './inspect/CoastalPolygonFormatter';
import { buildCoastalLayerGroups } from './layers/CoastalLayerGroups';
import { CoastalDomainContent } from './domain/CoastalDomainContent';

export const coastalManifest: FeatureManifest = {
  id: 'coastal',
  label: 'Coastal & Wave Attenuation',
  icon: <Icon name="coastal" />,
  domainContent: { sublabel: 'Coastal', component: CoastalDomainContent },
  inspectFormatters: {
    'coast-polygons': CoastalPolygonFormatter,
    'placencia-30polygons-shape': CoastalPolygonFormatter,
  },
  mapOverlays: [
    CoastalMapLayers,
    CoastalEncoderPicker,
    CoastalLegend,
    CoastalResolutionToggle,
  ],
  layersRowGroup: buildCoastalLayerGroups,
};
