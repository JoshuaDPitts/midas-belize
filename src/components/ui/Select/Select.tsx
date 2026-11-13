import { useId } from 'react';
import { cn } from '@/lib/cn';
import styles from './Select.module.css';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
}

export function Select({ options, value, onChange, label, disabled, className }: SelectProps) {
  const id = useId();
  return (
    <div className={cn(styles.container, className)}>
      {label && <label htmlFor={id} className={styles.label}>{label}</label>}
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={styles.select}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}
