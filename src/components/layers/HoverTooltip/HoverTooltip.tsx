import type { AttributeDefinition, FeatureAttributes } from '@/types/layers';
import styles from './HoverTooltip.module.css';

interface HoverTooltipProps {
  feature: FeatureAttributes;
  attributes: AttributeDefinition[];
  position: { x: number; y: number };
}

export function HoverTooltip({ feature, attributes, position }: HoverTooltipProps) {
  const display = attributes.slice(0, 3);
  return (
    <div className={styles.tooltip} style={{ left: position.x, top: position.y }}>
      {display.map((attr) => (
        <div key={attr.field} className={styles.row}>
          <span className={styles.label}>{attr.label}</span>
          <span className={styles.value}>
            {String(feature[attr.field] ?? '')}
            {attr.unit && <span className={styles.unit}> {attr.unit}</span>}
          </span>
        </div>
      ))}
    </div>
  );
}
