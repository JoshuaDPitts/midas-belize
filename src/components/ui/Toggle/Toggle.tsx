import styles from './Toggle.module.css';
import { cn } from '@/lib/cn';

interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
  disabled?: boolean;
}

export function Toggle({ label, checked, onChange, className, disabled }: ToggleProps) {
  return (
    <label className={cn(styles.container, className)}>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(styles.track, checked && styles.checked)}
        disabled={disabled}
      >
        <span className={styles.thumb} />
      </button>
      <span className={styles.label}>{label}</span>
    </label>
  );
}
