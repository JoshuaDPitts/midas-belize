import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/lib/map', () => ({
  useMap: () => null,
  useMapContext: () => ({ mapRef: { current: null }, overlayRef: { current: null }, isReady: false }),
  MapCoordinates: () => null,
  // MC-006: MapExportMenu now renders in the right column and pulls these from
  // the '@/lib/map' barrel. useExport + parseKey run during render (the
  // useAtomValue mock below returns a truthy value for every atom, so the
  // export source reads as present), so both must be stubbed; the pure
  // serializers are only touched on click but are stubbed for completeness.
  useExport: () => ({ exportPng: () => Promise.resolve(new Blob()) }),
  parseKey: () => null,
  featuresToGeoJson: () => ({ type: 'FeatureCollection', features: [] }),
  featuresToCsv: () => '',
  buildFilename: () => 'midas-belize.png',
  downloadBlob: () => {},
}));
vi.mock('jotai', async (orig) => {
  const actual = await orig<typeof import('jotai')>();
  return { ...actual, useAtomValue: vi.fn(() => 'light'), useAtom: () => ['light', vi.fn()] };
});

import { MapChrome } from '@/components/app-shell/MapChrome';

describe('REQ-MC-001: MapChrome', () => {
  it('renders the chrome container with attribution text', () => {
    render(<MapChrome />);
    expect(screen.getByTestId('map-chrome')).toBeInTheDocument();
    expect(screen.getByTestId('map-chrome-attribution')).toBeInTheDocument();
  });
});
