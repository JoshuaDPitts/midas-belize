import { useId } from 'react';
import { cn } from '@/lib/cn';
import styles from './TextInput.module.css';

interface TextInputProps {
  placeholder?: string;
  onChange: (value: string) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
  value?: string;
}

export function TextInput({ placeholder, onChange, label, disabled, className, value }: TextInputProps) {
  const id = useId();
  return (
    <div className={cn(styles.container, className)}>
      {label && <label htmlFor={id} className={styles.label}>{label}</label>}
      <input
        id={id}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={styles.input}
      />
    </div>
  );
}
