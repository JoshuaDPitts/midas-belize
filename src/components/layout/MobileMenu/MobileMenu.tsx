'use client';
import { Icon } from '@/lib/icons';
import styles from './MobileMenu.module.css';

interface MobileMenuProps {
  open: boolean;
  onClose: () => void;
  items: { label: string; href: string }[];
}

export function MobileMenu({ open, onClose, items }: MobileMenuProps) {
  if (!open) return null;
  return (
    <div className={styles.overlay}>
      <div className={styles.panel}>
        <div className={styles.header}>
          <span className={styles.title}>Menu</span>
          <button className={styles.closeButton} onClick={onClose} aria-label="Close menu">
            <Icon name="close" size={18} />
          </button>
        </div>
        <div className={styles.items}>
          {items.map((item) => (
            <a key={item.href} href={item.href} className={styles.item}>{item.label}</a>
          ))}
        </div>
      </div>
    </div>
  );
}
