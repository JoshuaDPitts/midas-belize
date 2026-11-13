// tests/unit/map-engine/layerManagement.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { LayerStore } from '@/lib/map/core/layerStore';
import { LayerAlreadyExistsError, LayerNotFoundError, type LayerConfig } from '@/lib/map/layers/types';

const mkFill = (id: string, color = '#3b82f6'): LayerConfig => ({
  id, type: 'fill',
  source: { kind: 'geojson', data: { type: 'FeatureCollection', features: [] } },
  style: { color },
});

describe('LayerStore', () => {
  let store: LayerStore;
  beforeEach(() => { store = new LayerStore(); });

  it('addLayer registers a config', () => {
    store.addLayer(mkFill('a'));
    expect(store.get('a')?.id).toBe('a');
    expect(store.order()).toEqual(['a']);
  });

  it('addLayer throws on duplicate id', () => {
    store.addLayer(mkFill('a'));
    expect(() => store.addLayer(mkFill('a'))).toThrow(LayerAlreadyExistsError);
  });

  it('removeLayer removes by id', () => {
    store.addLayer(mkFill('a'));
    store.removeLayer('a');
    expect(store.get('a')).toBeUndefined();
  });

  it('removeLayer throws on unknown id', () => {
    expect(() => store.removeLayer('nope')).toThrow(LayerNotFoundError);
  });

  it('updateLayer shallow-merges the patch', () => {
    store.addLayer(mkFill('a', '#000'));
    store.updateLayer('a', { style: { color: '#fff' } } as Partial<LayerConfig>);
    const cfg = store.get('a') as Extract<LayerConfig, { type: 'fill' }>;
    expect(cfg.style.color).toBe('#fff');
  });

  it('updateLayer throws on unknown id', () => {
    expect(() => store.updateLayer('nope', {} as Partial<LayerConfig>)).toThrow(LayerNotFoundError);
  });

  it('setLayerOrder reorders', () => {
    store.addLayer(mkFill('a'));
    store.addLayer(mkFill('b'));
    store.addLayer(mkFill('c'));
    store.setLayerOrder(['c', 'a', 'b']);
    expect(store.order()).toEqual(['c', 'a', 'b']);
  });

  it('setLayerOrder rejects missing ids', () => {
    store.addLayer(mkFill('a'));
    expect(() => store.setLayerOrder(['b'])).toThrow(LayerNotFoundError);
  });
});
