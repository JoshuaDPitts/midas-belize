import type { FoodWebGuild } from '@/types/mimes';
import styles from './FoodWebDiagram.module.css';

interface FoodWebDiagramProps {
  guilds: FoodWebGuild[];
  width?: number;
  height?: number;
}

const VIZ_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
  '#8B5CF6', '#EC4899', '#06B6D4', '#F97316',
];

export function FoodWebDiagram({ guilds, width = 400, height = 340 }: FoodWebDiagramProps) {
  if (guilds.length === 0) return null;
  const maxBiomass = Math.max(...guilds.map((g) => g.biomass));
  const idIndex = new Map(guilds.map((g, i) => [g.id, i]));

  const trophicLevel = (g: FoodWebGuild): number => (g.preyIds.length === 0 ? 0 : 1 + Math.max(...g.preyIds.map((id) => {
    const prey = guilds.find((gg) => gg.id === id);
    return prey ? trophicLevel(prey) : 0;
  })));

  const levels = guilds.map((g) => trophicLevel(g));
  const maxLevel = Math.max(...levels);
  const levelGroups = new Map<number, number>();

  const positions = guilds.map((g, i) => {
    const lv = levels[i];
    const count = levelGroups.get(lv) ?? 0;
    levelGroups.set(lv, count + 1);
    const y = height - 50 - (maxLevel > 0 ? (lv / maxLevel) * (height - 100) : 0);
    return { x: 0, y, level: lv, indexInLevel: count };
  });

  const levelCounts = new Map<number, number>();
  levels.forEach((lv) => levelCounts.set(lv, (levelCounts.get(lv) ?? 0) + 1));
  positions.forEach((p) => {
    const total = levelCounts.get(p.level) ?? 1;
    const spacing = width / (total + 1);
    p.x = spacing * (p.indexInLevel + 1);
  });

  // Trophic level labels
  const trophicLabels = ['Producers', 'Primary Consumers', 'Secondary Consumers', 'Apex Predators'];

  // Build edge list for flow particles
  const edges: { fromIdx: number; toIdx: number; preyId: string; predId: string }[] = [];
  guilds.forEach((g) => {
    g.preyIds.forEach((preyId) => {
      const fromIdx = idIndex.get(preyId);
      const toIdx = idIndex.get(g.id);
      if (fromIdx !== undefined && toIdx !== undefined) {
        edges.push({ fromIdx, toIdx, preyId, predId: g.id });
      }
    });
  });

  return (
    <div className={styles.container}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={styles.svg}>
        <defs>
          {/* Glow filters */}
          {guilds.map((_, i) => (
            <filter key={`glow-${i}`} id={`fw-glow-${i}`} x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feFlood floodColor={VIZ_COLORS[i % VIZ_COLORS.length]} floodOpacity="0.35" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="glow" />
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          ))}
          {/* Arrow marker */}
          <marker id="fw-arrow" viewBox="0 0 10 8" refX="10" refY="4" markerWidth="7" markerHeight="5" orient="auto-start-reverse">
            <path d="M0,1 L8,4 L0,7 Z" fill="rgba(200,210,230,0.5)" />
          </marker>
          {/* Edge gradients */}
          {edges.map(({ fromIdx, toIdx, preyId, predId }) => (
            <linearGradient key={`grad-${preyId}-${predId}`} id={`fw-edge-${preyId}-${predId}`}
              x1={positions[fromIdx].x} y1={positions[fromIdx].y}
              x2={positions[toIdx].x} y2={positions[toIdx].y}
              gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor={VIZ_COLORS[fromIdx % VIZ_COLORS.length]} stopOpacity="0.5" />
              <stop offset="100%" stopColor={VIZ_COLORS[toIdx % VIZ_COLORS.length]} stopOpacity="0.5" />
            </linearGradient>
          ))}
          {/* Radial gradients for nodes */}
          {guilds.map((_, i) => {
            const color = VIZ_COLORS[i % VIZ_COLORS.length];
            return (
              <radialGradient key={`nodegrad-${i}`} id={`fw-node-${i}`} cx="50%" cy="50%">
                <stop offset="0%" stopColor={color} stopOpacity="0.95" />
                <stop offset="100%" stopColor={color} stopOpacity="0.7" />
              </radialGradient>
            );
          })}
        </defs>

        {/* Trophic level bands */}
        {Array.from({ length: maxLevel + 1 }, (_, lv) => {
          const bandY = height - 50 - (lv / maxLevel) * (height - 100);
          return (
            <g key={`band-${lv}`} className={styles.trophicBand}>
              <line x1={20} y1={bandY} x2={width - 20} y2={bandY} stroke="var(--glass-border-subtle)" strokeWidth={1} strokeDasharray="4 8" />
              <text x={14} y={bandY - 6} fontSize={9} fill="rgba(255,255,255,0.45)" fontFamily="var(--font-mono)" fontWeight="500" letterSpacing="0.05em">
                {trophicLabels[lv] ?? `TL${lv}`}
              </text>
            </g>
          );
        })}

        {/* Edges */}
        {edges.map(({ fromIdx, toIdx, preyId, predId }) => {
          const from = positions[fromIdx];
          const to = positions[toIdx];
          const toR = 10 + (guilds[toIdx].biomass / maxBiomass) * 18;
          const dx = to.x - from.x;
          const dy = to.y - from.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const endX = to.x - (dx / dist) * (toR + 6);
          const endY = to.y - (dy / dist) * (toR + 6);

          return (
            <line
              key={`${preyId}-${predId}`}
              data-edge
              x1={from.x} y1={from.y}
              x2={endX} y2={endY}
              stroke={`url(#fw-edge-${preyId}-${predId})`}
              strokeWidth={2.5}
              markerEnd="url(#fw-arrow)"
              className={styles.edge}
            />
          );
        })}

        {/* Flow particles on edges */}
        {edges.map(({ fromIdx, toIdx, preyId, predId }, ei) => {
          const from = positions[fromIdx];
          const to = positions[toIdx];
          const toR = 10 + (guilds[toIdx].biomass / maxBiomass) * 18;
          const dx = to.x - from.x;
          const dy = to.y - from.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const endX = to.x - (dx / dist) * (toR + 6);
          const endY = to.y - (dy / dist) * (toR + 6);
          const color = VIZ_COLORS[fromIdx % VIZ_COLORS.length];

          return (
            <circle
              key={`particle-${preyId}-${predId}`}
              r={3}
              fill={color}
              opacity={0}
              className={styles.flowParticle}
              style={{
                offsetPath: `path("M${from.x},${from.y} L${endX},${endY}")`,
                animationDelay: `${ei * 0.7}s`,
              } as React.CSSProperties}
            >
              <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.9;1" dur="2.5s" begin={`${ei * 0.7}s`} repeatCount="indefinite" />
            </circle>
          );
        })}

        {/* Nodes */}
        {guilds.map((g, i) => {
          const r = 10 + (g.biomass / maxBiomass) * 18;
          const color = VIZ_COLORS[i % VIZ_COLORS.length];
          return (
            <g key={g.id} data-node className={styles.node}>
              {/* Pulsing outer glow ring */}
              <circle cx={positions[i].x} cy={positions[i].y} r={r + 8} fill="none" stroke={color} strokeWidth={1.5} className={styles.nodeGlowRing} />
              {/* Outer ring */}
              <circle cx={positions[i].x} cy={positions[i].y} r={r + 3} fill="none" stroke={color} strokeWidth={1} opacity={0.25} />
              {/* Main node with radial gradient */}
              <circle cx={positions[i].x} cy={positions[i].y} r={r} fill={`url(#fw-node-${i})`} filter={`url(#fw-glow-${i})`} />
              {/* Biomass value */}
              {r > 14 && (
                <>
                  <text x={positions[i].x} y={positions[i].y + 5} textAnchor="middle" fontSize={13} fontWeight="800" fill="rgba(0,0,0,0.4)" fontFamily="var(--font-mono)">
                    {g.biomass}
                  </text>
                  <text x={positions[i].x} y={positions[i].y + 4} textAnchor="middle" fontSize={13} fontWeight="800" fill="#fff" fontFamily="var(--font-mono)">
                    {g.biomass}
                  </text>
                </>
              )}
              {/* Label background for readability */}
              <rect
                x={positions[i].x - g.name.length * 3.5 - 6}
                y={positions[i].y + r + 6}
                width={g.name.length * 7 + 12}
                height={18}
                rx={9}
                fill="rgba(8,12,21,0.7)"
              />
              {/* Label */}
              <text x={positions[i].x} y={positions[i].y + r + 19} textAnchor="middle" fontSize={12} fontWeight="700" fill="#fff">
                {g.name}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
