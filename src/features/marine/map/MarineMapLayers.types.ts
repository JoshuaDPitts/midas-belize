import type { SiteId } from '@/lib/data/types';

export interface MarineLayerConfigSpec {
  datasetId: string;
  family: 'marine-polygons' | 'coast-polygons' | 'polygon-grid';
}

export type MarineSiteId = Extract<SiteId, 'placencia' | 'caye-caulker' | 'laughing-bird'>;
