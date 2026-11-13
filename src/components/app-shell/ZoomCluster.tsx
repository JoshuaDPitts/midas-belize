'use client';
import { useEffect, useState } from 'react';
import { useMap } from '@/lib/map';
import { ZoomControls } from '@/components/map/ZoomControls/ZoomControls';

export function ZoomCluster() {
  const map = useMap();
  const [zoom, setZoom] = useState(0);
  useEffect(() => {
    if (!map) return;
    const update = () => setZoom(Math.round(map.getZoom() * 10) / 10);
    update();
    map.on('zoomend', update);
    return () => {
      map.off('zoomend', update);
    };
  }, [map]);
  return (
    <ZoomControls zoom={zoom} onZoomIn={() => map?.zoomIn()} onZoomOut={() => map?.zoomOut()} />
  );
}
