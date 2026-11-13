'use client';
import { useRef, type KeyboardEvent } from 'react';
import { useAtom } from 'jotai';
import { coastalEncodingAtom, coastalAutoEncodingAtom, type CoastalEncodingMode } from '@/atoms';
import styles from './CoastalEncoderPicker.module.css';

interface PillSpec {
  mode: CoastalEncodingMode;
  label: string;
  title: string;
}

const PILLS: PillSpec[] = [
  {
    mode: 'vulnerability',
    label: 'Vulnerability',
    title: 'Color coastal polygons by their composite vulnerability score.',
  },
  {
    mode: 'mangrove',
    label: 'Mangrove',
    title: 'Color coastal polygons by mangrove coverage percentage.',
  },
  {
    mode: 'scenario-delta',
    label: 'Scenario Delta',
    title: 'Color coastal polygons by the change in vulnerability between scenarios.',
  },
];

export function CoastalEncoderPicker() {
  const [encoding, setEncoding] = useAtom(coastalEncodingAtom);
  const [autoEncoding, setAutoEncoding] = useAtom(coastalAutoEncodingAtom);
  const pillRefs = useRef<Array<HTMLButtonElement | null>>([]);

  function selectAt(idx: number) {
    setAutoEncoding(false);
    setEncoding(PILLS[idx].mode);
    pillRefs.current[idx]?.focus();
  }

  function onPillClick(idx: number) {
    selectAt(idx);
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const idx = PILLS.findIndex((p) => p.mode === encoding);
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      selectAt((idx + 1) % PILLS.length);
      return;
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      selectAt((idx - 1 + PILLS.length) % PILLS.length);
      return;
    }
    if (e.key === 'Home') {
      e.preventDefault();
      selectAt(0);
      return;
    }
    if (e.key === 'End') {
      e.preventDefault();
      selectAt(PILLS.length - 1);
    }
  }

  return (
    <div
      role="radiogroup"
      aria-label="Coastal map color encoding"
      className={styles.picker}
      onKeyDown={onKeyDown}
    >
      {autoEncoding && (
        <span className={styles.autoBadge} aria-label="Auto encoding active">
          AUTO
        </span>
      )}
      {PILLS.map((p, i) => (
        <button
          ref={(node) => {
            pillRefs.current[i] = node;
          }}
          key={p.mode}
          role="radio"
          type="button"
          aria-checked={encoding === p.mode}
          aria-label={p.label}
          aria-description={p.title}
          title={p.title}
          className={`${styles.pill} ${encoding === p.mode ? styles.pillActive : ''}`}
          onClick={() => onPillClick(i)}
          tabIndex={encoding === p.mode ? 0 : -1}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
