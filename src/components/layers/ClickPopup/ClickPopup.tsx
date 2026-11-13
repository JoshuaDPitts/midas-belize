import { Icon } from '@/lib/icons';
import type { AttributeDefinition, FeatureAttributes } from '@/types/layers';
import styles from './ClickPopup.module.css';

interface ClickPopupProps {
  feature: FeatureAttributes;
  attributes: AttributeDefinition[];
  position: { x: number; y: number };
  onClose: () => void;
}

export function ClickPopup({ feature, attributes, position, onClose }: ClickPopupProps) {
  return (
    <div className={styles.popup} style={{ left: position.x, top: position.y }}>
      <div className={styles.header}>
        <button className={styles.closeButton} onClick={onClose} aria-label="Close">
          <Icon name="close" size={14} />
        </button>
      </div>
      {attributes.map((attr) => (
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
