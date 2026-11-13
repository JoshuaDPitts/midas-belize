import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { marineManifest } from '@/features/marine';
import { FEATURES } from '@/features';
import { FeaturesProvider } from '@/components/app-shell/context/FeaturesProvider';
import { useFeatures } from '@/components/app-shell/hooks/useFeatures';
import type { ReactNode } from 'react';

describe('REQ-MA-001 — Marine FeatureManifest', () => {
  it('exports a manifest with id "marine"', () => {
    expect(marineManifest.id).toBe('marine');
  });

  it('has label "Marine & Food Web"', () => {
    expect(marineManifest.label).toBe('Marine & Food Web');
  });

  it('has a non-null icon (Lucide Fish via Icon registry)', () => {
    expect(marineManifest.icon).not.toBeNull();
  });

  it('contributes domainContent with sublabel "Marine"', () => {
    expect(marineManifest.domainContent).toBeDefined();
    expect(marineManifest.domainContent?.sublabel).toBe('Marine');
  });

  it('is registered in FEATURES', () => {
    expect(FEATURES.some((f) => f.id === 'marine')).toBe(true);
  });
});

describe('Marine — useFeatures integration (jsdom)', () => {
  function wrapper({ children }: { children: ReactNode }) {
    return <FeaturesProvider value={FEATURES}>{children}</FeaturesProvider>;
  }

  it('useFeatures returns Marine through the FeaturesProvider', () => {
    const { result } = renderHook(() => useFeatures(), { wrapper });
    expect(result.current.some((f) => f.id === 'marine')).toBe(true);
  });
});
