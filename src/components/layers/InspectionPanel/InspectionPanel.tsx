import type { AttributeDefinition, FeatureAttributes } from '@/types/layers';
import styles from './InspectionPanel.module.css';

interface InspectionPanelProps {
  feature: FeatureAttributes;
  attributes: AttributeDefinition[];
}

export function InspectionPanel({ feature, attributes }: InspectionPanelProps) {
  return (
    <div className={styles.panel}>
      {attributes.map((attr) => (
        <div key={attr.field} className={styles.row}>
          <span className={styles.label}>{attr.label}</span>
          <span className={styles.value}>
            <span>{String(feature[attr.field] ?? '\u2014')}</span>
            {attr.unit && <span className={styles.unit}>{attr.unit}</span>}
          </span>
        </div>
      ))}
    </div>
  );
}
