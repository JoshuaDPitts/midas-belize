'use client';
import { useState, type ReactNode } from 'react';
import styles from './BottomSheet.module.css';

type Snap = 'peek' | 'expanded';

/**
 * Bottom-edge glass sheet with two snap points (30vh peek / 80vh expanded).
 * Tap the drag handle to cycle. Drag-physics deferred to a future REQ — the
 * tap-to-cycle is sufficient for v1 and avoids pointer-event complexity.
 */
export function BottomSheet({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const [snap, setSnap] = useState<Snap>('peek');
  if (!open) return null;
  return (
    <div className={styles.sheet} data-testid="bottom-sheet" data-snap={snap}>
      <div
        className={styles.handleRow}
        data-testid="sheet-handle"
        role="button"
        aria-label="Drag to resize sheet"
        tabIndex={0}
        onClick={() => setSnap((s) => (s === 'peek' ? 'expanded' : 'peek'))}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose();
        }}
      >
        <span className={styles.handle} aria-hidden />
      </div>
      <div className={styles.body}>{children}</div>
    </div>
  );
}
