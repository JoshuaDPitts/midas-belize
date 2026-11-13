'use client';
import { useMemo, useState } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { activeSiteAtom, visibleLayersAtom, layerOpacityAtom } from '@/atoms';
import { useLayersForSite, type LayerSummary, type SiteId } from '@/lib/data';
import { Icon } from '@/lib/icons';
import { useFeatures } from '../hooks/useFeatures';
import type { FeatureManifest, LayerGroupSpec } from '@/features/_types';
import styles from './LayersTab.module.css';

export function LayersTab() {
  const activeSite = useAtomValue(activeSiteAtom);
  const { layers, loading, error } = useLayersForSite(activeSite);
  const [query, setQuery] = useState('');
  const [grouped, setGrouped] = useState(false);
  const features = useFeatures();

  const filtered = useMemo(() => {
    if (!query) return layers;
    const q = query.toLowerCase();
    return layers.filter(
      (l) => l.id.toLowerCase().includes(q) || l.title.toLowerCase().includes(q),
    );
  }, [layers, query]);

  if (error) {
    return (
      <div data-testid="panel-layers">
        <p className={styles.error} data-testid="panel-layers-error">
          Failed to load layers — try again later.
        </p>
      </div>
    );
  }
  if (loading && layers.length === 0) {
    return (
      <div data-testid="panel-layers">
        <p className={styles.empty} data-testid="panel-layers-loading">
          Loading…
        </p>
      </div>
    );
  }
  if (!loading && layers.length === 0) {
    return (
      <div data-testid="panel-layers">
        <p className={styles.empty} data-testid="panel-layers-empty">
          No layers configured for this site yet.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.tab} data-testid="panel-layers">
      <div className={styles.toolbar}>
        <input
          type="search"
          className={styles.search}
          data-testid="layer-search"
          placeholder="Search layers"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button
          type="button"
          className={`${styles.pill} ${grouped ? styles.pillActive : ''}`}
          data-testid="layer-group-toggle"
          aria-pressed={grouped}
          onClick={() => setGrouped((v) => !v)}
        >
          Group
        </button>
      </div>
      {grouped ? <Grouped layers={filtered} /> : <Flat layers={filtered} />}
      <FeatureLayerGroups features={features} layers={filtered} activeSite={activeSite} />
    </div>
  );
}

function FeatureLayerGroups({
  features,
  layers,
  activeSite,
}: {
  features: readonly FeatureManifest[];
  layers: LayerSummary[];
  activeSite: SiteId | null;
}) {
  const groups = useMemo(() => {
    const layerById = new Map(layers.map((l) => [l.id, l]));
    type GroupRender = {
      featureId: string;
      featureLabel: string;
      spec: LayerGroupSpec;
      layers: LayerSummary[];
    };
    const out: GroupRender[] = [];
    for (const f of features) {
      if (!f.layersRowGroup) continue;
      const specs = f.layersRowGroup(activeSite);
      for (const spec of specs) {
        const matched = spec.layerIds
          .map((id) => layerById.get(id))
          .filter((l): l is LayerSummary => Boolean(l));
        out.push({ featureId: f.id, featureLabel: f.label, spec, layers: matched });
      }
    }
    out.sort((a, b) => a.spec.order - b.spec.order);
    return out;
  }, [features, layers, activeSite]);

  return (
    <>
      {groups.map(({ featureId, featureLabel, spec, layers: groupLayers }) => (
        <section
          key={spec.id}
          className={styles.featureGroup}
          data-testid={`feature-group-${featureId}`}
        >
          <div className={styles.featureGroupLabel}>{featureLabel}</div>
          <div
            className={styles.layerGroupSection}
            data-testid={`layer-group-spec-${spec.id}`}
          >
            <div className={styles.layerGroupSectionLabel}>{spec.label}</div>
            {groupLayers.map((l) => (
              <LayerRow key={l.id} layer={l} />
            ))}
          </div>
        </section>
      ))}
    </>
  );
}

function Flat({ layers }: { layers: LayerSummary[] }) {
  return (
    <div className={styles.tab}>
      {layers.map((l) => (
        <LayerRow key={l.id} layer={l} />
      ))}
    </div>
  );
}

function Grouped({ layers }: { layers: LayerSummary[] }) {
  const byFamily = useMemo(() => {
    const map = new Map<string, LayerSummary[]>();
    for (const l of layers) {
      const arr = map.get(l.family) ?? [];
      arr.push(l);
      map.set(l.family, arr);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [layers]);

  return (
    <>
      {byFamily.map(([family, ls]) => (
        <div key={family} className={styles.group} data-testid={`layer-group-${family}`}>
          <div className={styles.groupLabel}>{family}</div>
          {ls.map((l) => (
            <LayerRow key={l.id} layer={l} />
          ))}
        </div>
      ))}
    </>
  );
}

function LayerRow({ layer }: { layer: LayerSummary }) {
  const [visible, setVisible] = useAtom(visibleLayersAtom);
  const [, setOpacity] = useAtom(layerOpacityAtom);
  const opacityValue = useAtomValue(layerOpacityAtom)[layer.id] ?? 1;
  const [dragOver, setDragOver] = useState(false);
  const [showProv, setShowProv] = useState(false);

  const isVisible = visible.includes(layer.id);

  const onDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/x-layer-id', layer.id);
    e.dataTransfer.effectAllowed = 'move';
  };
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOver(true);
  };
  const onDragLeave = () => setDragOver(false);
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const fromId = e.dataTransfer.getData('text/x-layer-id');
    if (!fromId || fromId === layer.id) return;
    setVisible((cur) => {
      const without = cur.filter((id) => id !== fromId);
      const idx = without.indexOf(layer.id);
      if (idx === -1) return [...without, fromId];
      return [...without.slice(0, idx + 1), fromId, ...without.slice(idx + 1)];
    });
  };

  const writeOpacity = (next: number) =>
    setOpacity((prev) => ({ ...prev, [layer.id]: next }));

  return (
    <>
      <div
        className={styles.row}
        data-testid={`layer-row-${layer.id}`}
        data-dragover={dragOver}
        draggable
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <span className={styles.dragHandle} aria-hidden>
          <Icon name="grip-vertical" size={12} />
        </span>
        <input
          type="checkbox"
          className={styles.checkbox}
          data-testid={`layer-vis-${layer.id}`}
          checked={isVisible}
          onChange={() => {
            setVisible((cur) =>
              cur.includes(layer.id)
                ? cur.filter((id) => id !== layer.id)
                : [...cur, layer.id],
            );
          }}
        />
        <span className={styles.title} title={layer.title}>
          {layer.title}
        </span>
        <input
          type="range"
          className={styles.opacity}
          data-testid={`layer-opacity-${layer.id}`}
          min={0}
          max={1}
          step={0.05}
          value={opacityValue}
          onChange={(e) => writeOpacity(Number(e.target.value))}
          onInput={(e) => writeOpacity(Number((e.target as HTMLInputElement).value))}
        />
        <button
          type="button"
          className={styles.info}
          data-testid={`layer-info-${layer.id}`}
          aria-label={`Show provenance for ${layer.title}`}
          aria-expanded={showProv}
          onClick={() => setShowProv((v) => !v)}
        >
          <Icon name="info" size={12} />
        </button>
      </div>
      {showProv && (
        <div className={styles.popover} data-testid={`layer-prov-${layer.id}`}>
          <div>
            <span className={styles.popKey}>Source: </span>
            <span className={styles.popVal}>{layer.provenance.source}</span>
          </div>
          <div>
            <span className={styles.popKey}>License: </span>
            <span className={styles.popVal}>{layer.provenance.license}</span>
          </div>
          <div>
            <span className={styles.popKey}>Citation: </span>
            <span className={styles.popVal}>{layer.provenance.citation}</span>
          </div>
          {layer.temporal_extent && (
            <div>
              <span className={styles.popKey}>Time: </span>
              <span className={styles.popVal}>
                {layer.temporal_extent.start} → {layer.temporal_extent.end}
              </span>
            </div>
          )}
        </div>
      )}
    </>
  );
}
