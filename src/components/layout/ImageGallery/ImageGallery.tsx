'use client';
import { useState } from 'react';
import { Modal } from '@/components/ui/Modal/Modal';
import styles from './ImageGallery.module.css';

interface GalleryImage {
  src: string;
  alt: string;
  caption?: string;
}

interface ImageGalleryProps {
  images: GalleryImage[];
}

export function ImageGallery({ images }: ImageGalleryProps) {
  const [selected, setSelected] = useState<GalleryImage | null>(null);

  return (
    <>
      <div className={styles.grid}>
        {images.map((img) => (
          <button key={img.src} className={styles.thumb} onClick={() => setSelected(img)}>
            <img src={img.src} alt={img.alt} className={styles.image} />
            {img.caption && <span className={styles.caption}>{img.caption}</span>}
          </button>
        ))}
      </div>
      {selected && (
        <Modal open onClose={() => setSelected(null)} title={selected.alt} size="lg">
          <img src={selected.src} alt={selected.alt} style={{ width: '100%', borderRadius: 8 }} />
          {selected.caption && <p style={{ marginTop: 'var(--space-2)', fontSize: 'var(--font-size-content-sm)', color: 'var(--color-text-secondary)' }}>{selected.caption}</p>}
        </Modal>
      )}
    </>
  );
}
