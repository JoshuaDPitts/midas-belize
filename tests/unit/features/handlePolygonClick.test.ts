import { describe, it, expect, vi } from 'vitest';
import { handlePolygonClick } from '@/features/_shared/handlePolygonClick';
import { buildKey } from '@/lib/map/interaction/selectionKey';

const ref = { layerId: 'L', featureId: '3' };
const props = { Polygon_ID: '3' };
const coord: [number, number] = [-88, 17];

describe('REQ-MC-008: handlePolygonClick', () => {
  it('plain click: single inspect + selection reset to that one', () => {
    const setSelected = vi.fn(), setInspected = vi.fn(), setSelection = vi.fn();
    handlePolygonClick({ ref, properties: props, coordinate: coord, shiftKey: false, currentSelection: new Set(['L:9']), setSelected, setInspected, setSelection });
    expect(setSelected).toHaveBeenCalledWith(ref);
    expect(setInspected).toHaveBeenCalledWith(expect.objectContaining({ layerId: 'L', featureId: '3', properties: props }));
    expect(setSelection).toHaveBeenCalledWith(new Set([buildKey('L', '3')]));
  });
  it('shift click: toggles into selection, no single inspect', () => {
    const setSelected = vi.fn(), setInspected = vi.fn(), setSelection = vi.fn();
    handlePolygonClick({ ref, properties: props, coordinate: coord, shiftKey: true, currentSelection: new Set(['L:9']), setSelected, setInspected, setSelection });
    expect(setInspected).not.toHaveBeenCalled();
    expect(setSelection).toHaveBeenCalledWith(new Set(['L:9', buildKey('L', '3')]));
  });
});
