import type { CoBenefit } from '@/types/mimes';

interface RadarChartProps {
  axes: CoBenefit[];
  comparisonAxes?: CoBenefit[];
  labels?: string[];
  size?: number;
}

export function RadarChart({ axes, comparisonAxes, labels, size = 240 }: RadarChartProps) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 30;
  const n = axes.length;

  const toPoint = (value: number, i: number) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    return { x: cx + Math.cos(angle) * r * value, y: cy + Math.sin(angle) * r * value };
  };

  const toPolygon = (values: CoBenefit[]) =>
    values.map((v, i) => { const p = toPoint(v.value, i); return `${p.x},${p.y}`; }).join(' ');

  // Grid rings
  const rings = [0.25, 0.5, 0.75, 1];

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Grid */}
      {rings.map((rv) => {
        const pts = Array.from({ length: n }, (_, i) => { const p = toPoint(rv, i); return `${p.x},${p.y}`; });
        return (
          <path
            key={rv}
            d={`M${pts.join('L')}Z`}
            fill="none"
            stroke="var(--color-border)"
            strokeWidth={0.5}
            opacity={0.5}
          />
        );
      })}
      {/* Axis lines */}
      {axes.map((_, i) => {
        const p = toPoint(1, i);
        return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="var(--color-border)" strokeWidth={0.5} opacity={0.3} />;
      })}
      {/* Comparison polygon */}
      {comparisonAxes && (
        <polygon points={toPolygon(comparisonAxes)} fill="var(--color-viz-4)" fillOpacity={0.15} stroke="var(--color-viz-4)" strokeWidth={1.5} />
      )}
      {/* Primary polygon */}
      <polygon points={toPolygon(axes)} fill="var(--color-accent)" fillOpacity={0.2} stroke="var(--color-accent)" strokeWidth={2} />
      {/* Labels */}
      {axes.map((a, i) => {
        const p = toPoint(1.18, i);
        return (
          <text key={a.name} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central" fontSize={10} fill="var(--color-text-secondary)">
            {a.name}
          </text>
        );
      })}
    </svg>
  );
}
