'use client';
import { useState, useRef, useEffect, type ReactNode } from 'react';
import styles from './Dropdown.module.css';

interface DropdownItem {
  label: string;
  onClick: () => void;
  icon?: ReactNode;
}

interface DropdownProps {
  trigger: ReactNode;
  items: DropdownItem[];
}

export function Dropdown({ trigger, items }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  return (
    <div className={styles.container} ref={ref}>
      <div onClick={() => setOpen(!open)}>{trigger}</div>
      {open && (
        <div className={styles.menu} role="menu">
          {items.map((item) => (
            <button
              key={item.label}
              className={styles.item}
              role="menuitem"
              onClick={() => {
                item.onClick();
                setOpen(false);
              }}
            >
              {item.icon && <span className={styles.itemIcon}>{item.icon}</span>}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
