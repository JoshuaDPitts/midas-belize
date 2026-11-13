'use client';
import { useState, type ReactNode } from 'react';
import type { Placement } from '@/types/components';
import styles from './Tooltip.module.css';

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  placement?: Placement;
}

export function Tooltip({ content, children, placement = 'top' }: TooltipProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div
      className={styles.container}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div className={`${styles.tooltip} ${styles[placement]}`} role="tooltip">
          {content}
        </div>
      )}
    </div>
  );
}
