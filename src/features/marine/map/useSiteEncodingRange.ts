'use client';
import { useMemo } from 'react';
import type { MarinePolygonFeature } from './usePolygonGeoJson';
import type { ScoreRange } from './nbsColorScale';
import type { MarineEncodingMode } from '@/atoms';

const DEFAULT_RANGE: ScoreRange = { min: 0, max: 1 };

export function useSiteEncodingRange(
  features: MarinePolygonFeature[],
  encoding: MarineEncodingMode,
): ScoreRange {
  return useMemo(() => {
    if (encoding === 'clade') return DEFAULT_RANGE;
    const propKey = encoding === 'nbs' ? 'NbS_Score' : 'Restoration_Potential';
    const values = features
      .map((f) => f.properties?.[propKey])
      .filter((v): v is number => typeof v === 'number');
    if (values.length === 0) return DEFAULT_RANGE;
    return {
      min: Math.min(...values),
      max: Math.max(...values),
    };
  }, [features, encoding]);
}
