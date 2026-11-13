import type { AttributeDefinition, FeatureAttributes } from '@/types/layers';
import styles from './AttributeTable.module.css';

interface AttributeTableProps {
  features: FeatureAttributes[];
  attributes: AttributeDefinition[];
  onSort?: (field: string) => void;
}

export function AttributeTable({ features, attributes, onSort }: AttributeTableProps) {
  return (
    <table className={styles.table}>
      <thead>
        <tr>
          {attributes.map((attr) => (
            <th
              key={attr.field}
              className={styles.header}
              onClick={onSort ? () => onSort(attr.field) : undefined}
              style={onSort ? { cursor: 'pointer' } : undefined}
            >
              {attr.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {features.map((feat, i) => (
          <tr key={i} className={styles.row}>
            {attributes.map((attr) => (
              <td key={attr.field} className={styles.cell}>
                {String(feat[attr.field] ?? '\u2014')}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
