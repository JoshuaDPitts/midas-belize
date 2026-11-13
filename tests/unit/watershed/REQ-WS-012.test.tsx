import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import type { Feature, Polygon, MultiPolygon } from 'geojson';
import {
  WatershedThumbnail,
  boundsToViewBox,
  computeBbox,
  coordsToSvgPath,
} from '@/features/watershed/domain/WatershedThumbnail';

const squarePolygon: Feature<Polygon> = {
  type: 'Feature',
  properties: { Name: 'Square Creek' },
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [-88.4, 16.5],
        [-88.3, 16.5],
        [-88.3, 16.6],
        [-88.4, 16.6],
        [-88.4, 16.5],
      ],
    ],
  },
};

const multiPolygon: Feature<MultiPolygon> = {
  type: 'Feature',
  properties: { Name: 'Multi Bay' },
  geometry: {
    type: 'MultiPolygon',
    coordinates: [
      [
        [
          [-88.5, 16.4],
          [-88.45, 16.4],
          [-88.45, 16.45],
          [-88.5, 16.45],
          [-88.5, 16.4],
        ],
      ],
      [
        [
          [-88.3, 16.6],
          [-88.25, 16.6],
          [-88.25, 16.65],
          [-88.3, 16.65],
          [-88.3, 16.6],
        ],
      ],
    ],
  },
};

describe('REQ-WS-012: WatershedThumbnail SVG primitive', () => {
  describe('helpers', () => {
    it('computeBbox returns [minX, minY, maxX, maxY] for a single ring', () => {
      const bbox = computeBbox(squarePolygon.geometry);
      expect(bbox).toEqual([-88.4, 16.5, -88.3, 16.6]);
    });

    it('computeBbox walks all rings of a MultiPolygon', () => {
      const bbox = computeBbox(multiPolygon.geometry);
      expect(bbox).toEqual([-88.5, 16.4, -88.25, 16.65]);
    });

    it('boundsToViewBox returns "minX minY width height" with padding', () => {
      const viewBox = boundsToViewBox([-88.4, 16.5, -88.3, 16.6]);
      const parts = viewBox.split(' ').map(Number);
      expect(parts).toHaveLength(4);
      const [, , width, height] = parts;
      expect(width).toBeGreaterThan(0);
      expect(height).toBeGreaterThan(0);
    });

    it('coordsToSvgPath builds a closed M/L/Z path string for a polygon', () => {
      const d = coordsToSvgPath(squarePolygon.geometry);
      expect(d).toMatch(/^M/);
      expect(d).toContain('L');
      expect(d).toContain('Z');
    });

    it('coordsToSvgPath joins multiple rings for a MultiPolygon', () => {
      const d = coordsToSvgPath(multiPolygon.geometry);
      expect(d.match(/M/g)?.length).toBe(2);
      expect(d.match(/Z/g)?.length).toBe(2);
    });
  });

  describe('rendering', () => {
    it('renders an SVG containing a path element', () => {
      const { container } = render(
        <WatershedThumbnail feature={squarePolygon} encoderColor="rgb(0, 128, 128)" />,
      );
      const svg = container.querySelector('svg');
      expect(svg).not.toBeNull();
      expect(svg!.querySelector('path')).not.toBeNull();
    });

    it('defaults to 120px and accepts a 40px size', () => {
      const { container: big } = render(
        <WatershedThumbnail feature={squarePolygon} encoderColor="rgb(0,0,0)" />,
      );
      const { container: small } = render(
        <WatershedThumbnail feature={squarePolygon} encoderColor="rgb(0,0,0)" size={40} />,
      );
      expect(big.querySelector('svg')!.getAttribute('width')).toBe('120');
      expect(small.querySelector('svg')!.getAttribute('width')).toBe('40');
      expect(small.querySelector('svg')!.getAttribute('height')).toBe('40');
    });

    it('applies the encoder color to the path fill', () => {
      const { container } = render(
        <WatershedThumbnail feature={squarePolygon} encoderColor="rgb(10, 20, 30)" />,
      );
      const path = container.querySelector('path');
      expect(path?.getAttribute('fill')).toBe('rgb(10, 20, 30)');
    });

    it('adds a pulse animation class when active', () => {
      const { container } = render(
        <WatershedThumbnail
          feature={squarePolygon}
          encoderColor="rgb(0,0,0)"
          active
          data-testid="ws-thumb"
        />,
      );
      const svg = container.querySelector('svg');
      expect(svg).not.toBeNull();
      expect(svg!.getAttribute('data-active')).toBe('true');
      expect(svg!.getAttribute('class') ?? '').toMatch(/active/i);
    });

    it('renders without the active state by default', () => {
      const { container } = render(
        <WatershedThumbnail feature={squarePolygon} encoderColor="rgb(0,0,0)" />,
      );
      const svg = container.querySelector('svg');
      expect(svg!.getAttribute('data-active')).toBe('false');
    });

    it('exposes role="img" with an aria-label derived from feature name', () => {
      const { container } = render(
        <WatershedThumbnail feature={squarePolygon} encoderColor="rgb(0,0,0)" />,
      );
      const svg = container.querySelector('svg');
      expect(svg!.getAttribute('role')).toBe('img');
      expect(svg!.getAttribute('aria-label')).toMatch(/Square Creek/i);
    });

    it('handles MultiPolygon features without throwing', () => {
      const { container } = render(
        <WatershedThumbnail feature={multiPolygon} encoderColor="rgb(0,0,0)" />,
      );
      expect(container.querySelector('path')).not.toBeNull();
    });

    it('merges className prop onto the svg', () => {
      const { container } = render(
        <WatershedThumbnail
          feature={squarePolygon}
          encoderColor="rgb(0,0,0)"
          className="custom-cls"
        />,
      );
      expect(container.querySelector('svg')!.getAttribute('class') ?? '').toContain('custom-cls');
    });
  });
});
