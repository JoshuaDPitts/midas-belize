'use client';
import { useAtomValue } from 'jotai';
import {
  activeSiteAtom,
  inspectedFeatureAtom,
  queryResultAtom,
  selectionAtom,
  type FeatureHit,
  type QueryResult,
} from '@/atoms';
import { useLayersForSite, type LayerSummary } from '@/lib/data';
import { useFeatures } from '../hooks/useFeatures';
import styles from './InspectTab.module.css';

export function InspectTab() {
  const activeSite = useAtomValue(activeSiteAtom);
  const inspected = useAtomValue(inspectedFeatureAtom);
  const query = useAtomValue(queryResultAtom);
  const { layers } = useLayersForSite(activeSite);

  if (query?.kind === 'transect') {
    return (
      <div data-testid="panel-inspect">
        <SelectionCount />
        <TransectView profile={query.profile} />
      </div>
    );
  }
  if (query?.kind === 'area') {
    return (
      <div data-testid="panel-inspect">
        <SelectionCount />
        <AreaView summaries={query.summaries} />
      </div>
    );
  }

  if (!inspected) {
    return (
      <div data-testid="panel-inspect">
        <SelectionCount />
        <p className={styles.empty} data-testid="inspect-empty">
          Click a feature on the map, drag a lasso, or run a transect to inspect data.
        </p>
      </div>
    );
  }

  const layer = layers.find((l) => l.id === inspected.layerId);
  return (
    <div className={styles.tab} data-testid="panel-inspect">
      <SelectionCount />
      <div data-testid="inspect-feature">
        <FormattedFeature feature={inspected} layer={layer} />
      </div>
    </div>
  );
}

/** Multi-select count readout — shows in every InspectTab branch once >1 feature
 *  is shift-selected (selectionAtom). Single/empty selection renders nothing. */
function SelectionCount() {
  const selection = useAtomValue(selectionAtom);
  if (selection.size <= 1) return null;
  return (
    <div data-testid="inspect-selection-count" className={styles.selectionCount}>
      {selection.size} selected
    </div>
  );
}

function FormattedFeature({
  feature,
  layer,
}: {
  feature: FeatureHit;
  layer: LayerSummary | undefined;
}) {
  const features = useFeatures();
  const CustomByFeatureId = features
    .map((f) => f.inspectFormatters?.[feature.layerId])
    .find(Boolean);
  const effectiveLayer = layer ?? ({
    id: feature.layerId,
    layer: feature.layerId,
    title: feature.layerId,
    family: feature.layerId,
  } as LayerSummary);
  if (!layer && CustomByFeatureId) return <CustomByFeatureId feature={feature} layer={effectiveLayer} />;

  if (layer) {
    const Custom = features
      .map((f) => f.inspectFormatters?.[layer.family] ?? f.inspectFormatters?.[layer.id])
      .find(Boolean);
    if (Custom) return <Custom feature={feature} layer={layer} />;
  }
  return <GenericKV feature={feature} />;
}

function GenericKV({ feature }: { feature: FeatureHit }) {
  return (
    <div className={styles.card}>
      <h4 className={styles.cardTitle}>
        {feature.layerId} · #{String(feature.featureId)}
      </h4>
      <dl className={styles.kv}>
        {Object.entries(feature.properties).map(([k, v]) => (
          <div key={k} style={{ display: 'contents' }}>
            <dt className={styles.k}>{k}</dt>
            <dd className={styles.v} title={String(v)}>
              {formatValue(v)}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : v.toFixed(3);
  return String(v);
}

function AreaView({ summaries }: { summaries: Extract<QueryResult, { kind: 'area' }>['summaries'] }) {
  return (
    <div className={styles.tab} data-testid="inspect-area">
      {summaries.map((s) => (
        <div key={s.layerId} className={styles.card}>
          <h4 className={styles.cardTitle}>
            {s.layerId} — {s.count} features
          </h4>
          {Object.entries(s.numeric).map(([attr, stats]) => (
            <div key={attr}>
              <div className={styles.stat}>
                <span className={styles.statLabel}>{attr} mean</span>
                <span className={styles.statValue}>{stats.mean.toFixed(3)}</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statLabel}>min · max</span>
                <span className={styles.statValue}>
                  {stats.min.toFixed(3)} · {stats.max.toFixed(3)}
                </span>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function TransectView({ profile }: { profile: Extract<QueryResult, { kind: 'transect' }>['profile'] }) {
  const points = profile.samples
    .map((s) => {
      for (const layerId of Object.keys(s.values)) {
        const attrs = s.values[layerId];
        for (const k of Object.keys(attrs)) {
          const v = attrs[k];
          if (typeof v === 'number') return { x: s.distance, y: v, label: `${layerId}.${k}` };
        }
      }
      return null;
    })
    .filter((p): p is { x: number; y: number; label: string } => p !== null);

  if (points.length === 0) {
    return (
      <p className={styles.empty} data-testid="inspect-transect-empty">
        Transect has no numeric samples.
      </p>
    );
  }

  const w = 320;
  const h = 80;
  const pad = 4;
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys);
  const xRange = xMax - xMin || 1;
  const yRange = yMax - yMin || 1;
  const path = points
    .map(
      (p) =>
        `${pad + ((p.x - xMin) / xRange) * (w - 2 * pad)},${
          h - pad - ((p.y - yMin) / yRange) * (h - 2 * pad)
        }`,
    )
    .join(' ');

  return (
    <div className={styles.transect} data-testid="inspect-transect">
      <h4 className={styles.cardTitle}>
        {points[0]?.label} · {points.length} samples
      </h4>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        className={styles.svg}
        data-testid="transect-svg"
      >
        <polyline points={path} fill="none" stroke="var(--color-accent)" strokeWidth={1.5} />
      </svg>
    </div>
  );
}
