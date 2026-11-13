export type LayerDomain = 'watershed' | 'coastal' | 'marine' | 'social' | 'nbs';
export type LayerType = 'fill' | 'line' | 'circle' | 'heatmap' | 'raster' | 'symbol';

export interface AttributeDefinition {
  field: string;
  label: string;
  unit?: string;
  type: 'number' | 'string' | 'date';
  format?: string;
}

export type FeatureAttributes = Record<string, string | number | null>;

export interface LayerConfig {
  id: string;
  name: string;
  domain: LayerDomain;
  type: LayerType;
  visible: boolean;
  opacity: number;
  interactive: boolean;
  attributes: AttributeDefinition[];
}

export interface LayerGroupData {
  domain: LayerDomain;
  label: string;
  layers: LayerConfig[];
  expanded: boolean;
}
