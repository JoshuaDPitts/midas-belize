'use client';
import { useState, useId, useRef, useEffect } from 'react';
import { Icon } from '@/lib/icons';
import styles from './FormulaTooltip.module.css';

interface FormulaTooltipProps {
  label: string;
  formula: string;
  explanation: string;
}

export function FormulaTooltip({ label, formula, explanation }: FormulaTooltipProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<'top' | 'bottom'>('top');
  const id = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPosition(rect.top > 240 ? 'top' : 'bottom');
  }, [open]);

  return (
    <span className={styles.wrap}>
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        aria-label={`Show formula for ${label}`}
        aria-expanded={open}
        aria-controls={id}
        aria-describedby={open ? id : undefined}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            setOpen(false);
          }
        }}
      >
        <Icon name="info" size={12} />
      </button>
      {open && (
        <div role="tooltip" id={id} data-position={position} className={styles.tooltip}>
          <code className={styles.formula}>{formula}</code>
          <p className={styles.explanation}>{explanation}</p>
        </div>
      )}
    </span>
  );
}
