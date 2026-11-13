import { type ReactNode } from 'react';
import { Icon } from '@/lib/icons';
import type { LayerGroupData } from '@/types/layers';
import styles from './LayerGroup.module.css';

interface LayerGroupProps {
  group: LayerGroupData;
  onToggleGroup: (domain: string) => void;
  children: ReactNode;
}

export function LayerGroup({ group, onToggleGroup, children }: LayerGroupProps) {
  return (
    <div className={styles.container}>
      <button className={styles.header} onClick={() => onToggleGroup(group.domain)}>
        <Icon name={group.expanded ? 'chevron-down' : 'chevron-right'} size={14} />
        <span className={styles.label}>{group.label}</span>
        <span className={styles.count}>{group.layers.length}</span>
      </button>
      {group.expanded && <div className={styles.content}>{children}</div>}
    </div>
  );
}
