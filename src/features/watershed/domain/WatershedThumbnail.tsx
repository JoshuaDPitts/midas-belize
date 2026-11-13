import type { CSSProperties, SVGProps } from 'react';
import type { Feature, MultiPolygon, Polygon, Position } from 'geojson';
import styles from './WatershedThumbnail.module.css';

export type WatershedThumbnailFeature = Feature<Polygon | MultiPolygon>;
export type Bbox = [number, number, number, number];

const PAD_RATIO = 0.06;

function eachRing(
  geom: Polygon | MultiPolygon,
  visit: (ring: Position[], ringIndex: number) => void,
): void {
  if (geom.type === 'Polygon') {
    geom.coordinates.forEach((ring, i) => visit(ring, i));
    return;
  }
  let ringIndex = 0;
  for (const poly of geom.coordinates) {
    for (const ring of poly) {
      visit(ring, ringIndex++);
    }
  }
}

export function computeBbox(geom: Polygon | MultiPolygon): Bbox {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  eachRing(geom, (ring) => {
    for (const [x, y] of ring) {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  });
  return [minX, minY, maxX, maxY];
}

export function boundsToViewBox(bbox: Bbox): string {
  const [minX, minY, maxX, maxY] = bbox;
  const w = Math.max(maxX - minX, 1e-6);
  const h = Math.max(maxY - minY, 1e-6);
  const padX = w * PAD_RATIO;
  const padY = h * PAD_RATIO;
  return `${minX - padX} ${minY - padY} ${w + padX * 2} ${h + padY * 2}`;
}

export function coordsToSvgPath(geom: Polygon | MultiPolygon): string {
  const parts: string[] = [];
  eachRing(geom, (ring) => {
    if (ring.length === 0) return;
    const segments = ring.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x} ${y}`);
    parts.push(`${segments.join(' ')} Z`);
  });
  return parts.join(' ');
}

function featureLabel(feature: WatershedThumbnailFeature): string {
  const p = feature.properties ?? {};
  const raw =
    (p as Record<string, unknown>).Name ??
    (p as Record<string, unknown>).WATERSHED ??
    (p as Record<string, unknown>).MIMES_ID ??
    'Watershed';
  return `Watershed thumbnail: ${String(raw)}`;
}

export interface WatershedThumbnailProps
  extends Omit<SVGProps<SVGSVGElement>, 'width' | 'height' | 'viewBox' | 'role'> {
  feature: WatershedThumbnailFeature;
  encoderColor: string;
  size?: number;
  active?: boolean;
}

export function WatershedThumbnail({
  feature,
  encoderColor,
  size = 120,
  active = false,
  className,
  style,
  ...rest
}: WatershedThumbnailProps) {
  const bbox = computeBbox(feature.geometry);
  const viewBox = boundsToViewBox(bbox);
  const d = coordsToSvgPath(feature.geometry);
  const strokeWidth = Math.max((bbox[2] - bbox[0]) * 0.012, 1e-5);

  const classes = [styles.thumb, active ? styles.active : null, className]
    .filter(Boolean)
    .join(' ');

  const svgStyle: CSSProperties = {
    transform: 'scaleY(-1)',
    ...style,
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox={viewBox}
      role="img"
      aria-label={featureLabel(feature)}
      data-active={active ? 'true' : 'false'}
      className={classes}
      style={svgStyle}
      {...rest}
    >
      <path
        d={d}
        fill={encoderColor}
        stroke="var(--color-accent)"
        strokeWidth={active ? strokeWidth * 1.6 : strokeWidth}
        strokeOpacity={active ? 0.9 : 0.35}
        vectorEffect="non-scaling-stroke"
      />
      {active && (
        <path
          d={d}
          className={styles.pulse}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth={strokeWidth * 1.6}
          vectorEffect="non-scaling-stroke"
        />
      )}
    </svg>
  );
}
