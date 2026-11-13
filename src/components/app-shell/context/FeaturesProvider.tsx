'use client';
import { createContext, type ReactNode } from 'react';
import { FEATURES } from '@/features';
import type { FeatureManifest } from '@/features/_types';

export const FeaturesContext = createContext<readonly FeatureManifest[]>(FEATURES);

export function FeaturesProvider({
  value,
  children,
}: {
  value: readonly FeatureManifest[];
  children: ReactNode;
}) {
  return <FeaturesContext.Provider value={value}>{children}</FeaturesContext.Provider>;
}
