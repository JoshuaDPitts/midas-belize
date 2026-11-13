// src/features/_types.ts
import type { ComponentType, ReactNode } from 'react';
import type { FeatureHit } from '@/atoms';
import type { LayerSummary, SiteId } from '@/lib/data';

export interface InspectFormatterProps {
  feature: FeatureHit;
  layer: LayerSummary;
}

export interface LayerGroupSpec {
  /** Stable identifier; used as React key and in tests. e.g. 'watershed-placencia'. */
  id: string;
  /** Human-readable section label. e.g. 'Placencia Watersheds'. */
  label: string;
  /** Dataset / layer ids that belong in this group. Layers absent from the active site are silently skipped. */
  layerIds: string[];
  /** Sort key; lower renders first across all manifests' groups. */
  order: number;
}

export interface FeatureManifest {
  /** Stable identifier used as a React key and in tests. e.g. 'marine'. */
  id: string;
  /** Human-readable label (e.g. 'Marine & Food Web'). */
  label: string;
  /** Lucide icon node rendered in the sidebar rail. May be null in v1 fixtures. */
  icon: ReactNode;
  /** Optional: contributes site-scoped layer group specs to the Layers tab. */
  layersRowGroup?: (activeSite: SiteId | null) => LayerGroupSpec[];
  /** Optional: keyed lookup by layer family or layer id; the first match wins. */
  inspectFormatters?: Record<string, ComponentType<InspectFormatterProps>>;
  /** Optional: shown in the Scenarios tab. Tab auto-hides when no manifest contributes. */
  scenariosContent?: ComponentType;
  /** Optional: contributes a sub-tab inside the Domain panel. */
  domainContent?: { sublabel: string; component: ComponentType };
  /** Optional: rendered inside <MapArea> alongside Map Engine layers. */
  mapOverlays?: ComponentType[];
  /** Optional: appended to <BottomBar> when time is active. */
  bottomBarWidgets?: ComponentType[];
}
