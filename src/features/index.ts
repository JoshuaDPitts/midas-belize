// src/features/index.ts
import type { FeatureManifest } from './_types';
import { marineManifest } from './marine';
import { watershedManifest } from './watershed';
import { coastalManifest } from './coastal';
import { scenariosManifest } from './scenarios';

export const FEATURES: readonly FeatureManifest[] = [
  marineManifest,
  watershedManifest,
  coastalManifest,
  scenariosManifest,
] as const;
export type { FeatureManifest, InspectFormatterProps } from './_types';
