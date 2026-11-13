'use client';
import { useAtom } from 'jotai';
import { coastalResolutionAtom, type CoastalResolution } from '@/atoms';
import styles from './CoastalResolutionToggle.module.css';

interface PillSpec {
  value: CoastalResolution;
  label: string;
  title: string;
}

const PILLS: PillSpec[] = [
  {
    value: 'hires',
    label: 'Hi-res (30)',
    title: 'Use high-resolution 30m coastal polygons.',
  },
  {
    value: 'lores',
    label: 'Lo-res (8)',
    title: 'Use low-resolution 8m coastal polygons.',
  },
];

export function CoastalResolutionToggle() {
  const [resolution, setResolution] = useAtom(coastalResolutionAtom);

  return (
    <div
      role="radiogroup"
      aria-label="Coastal map resolution"
      className={styles.picker}
    >
      {PILLS.map((p) => (
        <button
          key={p.value}
          role="radio"
          type="button"
          aria-checked={resolution === p.value}
          aria-label={p.label}
          title={p.title}
          className={`${styles.pill} ${resolution === p.value ? styles.pillActive : ''}`}
          onClick={() => setResolution(p.value)}
          tabIndex={resolution === p.value ? 0 : -1}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
