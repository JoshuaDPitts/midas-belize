import { Icon } from '@/lib/icons';
import { Slider } from '@/components/ui/Slider/Slider';
import type { LayerConfig } from '@/types/layers';
import styles from './LayerRow.module.css';

interface LayerRowProps {
  layer: LayerConfig;
  onToggle: (id: string, visible: boolean) => void;
  onOpacityChange: (id: string, opacity: number) => void;
}

export function LayerRow({ layer, onToggle, onOpacityChange }: LayerRowProps) {
  return (
    <div className={styles.row} draggable="true">
      <button
        className={styles.eyeToggle}
        onClick={() => onToggle(layer.id, !layer.visible)}
        aria-label={`Toggle ${layer.name}`}
      >
        <Icon name={layer.visible ? 'eye' : 'eye-off'} size={16} />
      </button>
      <div className={styles.info}>
        <span className={styles.name}>{layer.name}</span>
        <span className={styles.badge}>{layer.domain}</span>
      </div>
      <Slider
        min={0}
        max={100}
        value={Math.round(layer.opacity * 100)}
        onChange={(v) => onOpacityChange(layer.id, v / 100)}
        className={styles.opacity}
        showValue={false}
      />
    </div>
  );
}
