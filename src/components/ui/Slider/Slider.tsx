import { type ChangeEvent } from 'react';
import styles from './Slider.module.css';
import { cn } from '@/lib/cn';

interface SliderProps {
  min: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
  label?: string;
  step?: number;
  className?: string;
  disabled?: boolean;
  showValue?: boolean;
}

export function Slider({ min, max, value, onChange, label, step = 1, className, disabled, showValue = true }: SliderProps) {
  const percent = ((value - min) / (max - min)) * 100;
  return (
    <div className={cn(styles.container, className)}>
      {label && <span className={styles.label}>{label}</span>}
      <input
        type="range"
        role="slider"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(Number(e.target.value))}
        aria-valuenow={value}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-label={label}
        className={styles.input}
        style={{ '--slider-percent': `${percent}%` } as React.CSSProperties}
        disabled={disabled}
      />
      {showValue && <span className={styles.value}>{value}</span>}
    </div>
  );
}
