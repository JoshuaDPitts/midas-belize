'use client';
import { useRef, type KeyboardEvent } from 'react';
import { useAtom } from 'jotai';
import { watershedEncodingAtom, type WatershedEncodingMode } from '@/atoms';
import styles from './WatershedEncoderPicker.module.css';

interface PillSpec {
  mode: WatershedEncodingMode;
  label: string;
  title: string;
}

const PILLS: PillSpec[] = [
  {
    mode: 'nbs',
    label: 'NbS',
    title: 'Color watersheds by their Nature-based Solutions score (Restoration Potential + Conservation Value).',
  },
  {
    mode: 'clade',
    label: 'Clade',
    title: 'Color watersheds by their dominant ecosystem clade (highest area-weighted Clade_N_pct).',
  },
  {
    mode: 'restoration',
    label: 'Restoration',
    title: 'Color watersheds by Restoration Potential alone.',
  },
  {
    mode: 'erosion-risk',
    label: 'Erosion Risk',
    title: 'Color watersheds by erosion risk (R*K*LS when joined, falls back to R*area).',
  },
];

export function WatershedEncoderPicker() {
  const [encoding, setEncoding] = useAtom(watershedEncodingAtom);
  const pillRefs = useRef<Array<HTMLButtonElement | null>>([]);

  function selectAt(idx: number) {
    setEncoding(PILLS[idx].mode);
    pillRefs.current[idx]?.focus();
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
      aria-label="Watershed map color encoding"
      className={styles.picker}
      onKeyDown={onKeyDown}
    >
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
          onClick={() => setEncoding(p.mode)}
          tabIndex={encoding === p.mode ? 0 : -1}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
