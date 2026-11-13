import type { FeatureManifest } from '@/features/_types';
import { Icon } from '@/lib/icons';
import { MarineDomainContent } from './domain/MarineDomainContent';
import { MarinePolygonFormatter } from './inspect/MarinePolygonFormatter';
import { SSTPointFormatter } from './inspect/SSTPointFormatter';
import { MarineMapLayers } from './map/MarineMapLayers';
import { EncoderPicker } from './map/EncoderPicker';
import { MapLegend } from './map/MapLegend';
import { PolygonInteraction } from './map/PolygonInteraction';
import { CoralPolygonPopup } from './domain/CoralPolygonPopup';

export const marineManifest: FeatureManifest = {
  id: 'marine',
  label: 'Marine & Food Web',
  icon: <Icon name="marine" />,
  domainContent: {
    sublabel: 'Marine',
    component: MarineDomainContent,
  },
  inspectFormatters: {
    'marine-polygons': MarinePolygonFormatter,
    'coast-polygons': MarinePolygonFormatter,
    'polygon-grid': MarinePolygonFormatter,
    'sst-monthly-2015-2024': SSTPointFormatter,
  },
  mapOverlays: [MarineMapLayers, EncoderPicker, MapLegend, PolygonInteraction, CoralPolygonPopup],
};
