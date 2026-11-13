'use client';
import { useEffect, useRef } from 'react';
import { useSetAtom } from 'jotai';
import { selectedPolygonAtom, hoveredPolygonAtom, coralPopupAtom } from '@/atoms';

/**
 * PolygonInteraction — transparent global handler component for polygon
 * keyboard and mouse-leave events.
 *
 * Renders a zero-z, pointer-events:none sentinel div so the mouseleave
 * boundary tracks the map container without intercepting deck.gl canvas
 * pointer events. The keydown listener is window-level so it fires
 * regardless of focus location within the map area.
 *
 * The mouseleave handler is attached via addEventListener (not the React
 * synthetic prop) so native dispatchEvent calls in tests and real browser
 * events both fire it correctly.
 *
 * REQ-MA-015: Escape clears selectedPolygonAtom (deselect-as-fly-back
 * is coordinated via the MarineMapLayers useEffect that watches selectedPolygon).
 * MouseLeave clears hoveredPolygonAtom (transient preview state).
 */
export function PolygonInteraction() {
  const setSelected = useSetAtom(selectedPolygonAtom);
  const setHovered = useSetAtom(hoveredPolygonAtom);
  const setCoralPopup = useSetAtom(coralPopupAtom);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setSelected(null);
        setCoralPopup(null);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setSelected, setCoralPopup]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    function onLeave() {
      setHovered(null);
    }
    el.addEventListener('mouseleave', onLeave);
    return () => el.removeEventListener('mouseleave', onLeave);
  }, [setHovered]);

  return (
    <div
      ref={rootRef}
      data-testid="polygon-interaction-root"
      style={{ position: 'absolute', inset: 0, zIndex: -1, pointerEvents: 'none' }}
    />
  );
}
