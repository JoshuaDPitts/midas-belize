'use client';
import { useAtom } from 'jotai';
import { drawModeAtom, type DrawMode } from '@/atoms';
import { FloatingToolbar } from '@/components/map/FloatingToolbar/FloatingToolbar';

const TOOLS: { id: Exclude<DrawMode, 'none'>; icon: string; name: string }[] = [
  { id: 'point', icon: 'crosshair', name: 'Point query' },
  { id: 'area', icon: 'polygon', name: 'Area query' },
  { id: 'transect', icon: 'line', name: 'Transect query' },
];

/** Draw-mode toolbar (MC-005). Bound to `drawModeAtom`; clicking the active
 *  tool toggles it back off. Mounted by MapChrome only while the Inspect panel
 *  is open (draw queries write the Inspect view). */
export function DrawToolbar() {
  const [mode, setMode] = useAtom(drawModeAtom);
  return (
    <FloatingToolbar
      actions={TOOLS.map((t) => ({
        name: t.name,
        icon: t.icon,
        active: mode === t.id,
        onClick: () => setMode(mode === t.id ? 'none' : t.id),
      }))}
    />
  );
}
