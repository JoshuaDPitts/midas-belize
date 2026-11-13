import { Icon } from '@/lib/icons';
import styles from './FloatingToolbar.module.css';

interface ToolbarAction {
  name: string;
  icon: string;
  onClick: () => void;
  active?: boolean;
}

interface FloatingToolbarProps {
  actions: ToolbarAction[];
}

export function FloatingToolbar({ actions }: FloatingToolbarProps) {
  return (
    <div className={styles.toolbar}>
      {actions.map((action) => (
        <button
          key={action.name}
          className={`${styles.button} ${action.active ? styles.active : ''}`}
          onClick={action.onClick}
          aria-label={action.name}
          data-active={action.active ?? false}
        >
          <Icon name={action.icon} size={18} />
        </button>
      ))}
    </div>
  );
}
