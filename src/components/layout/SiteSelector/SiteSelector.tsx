'use client';
import styles from './SiteSelector.module.css';

interface Site {
  slug: string;
  name: string;
}

interface SiteSelectorProps {
  sites: Site[];
  activeSite: string | null;
  onSelect: (slug: string) => void;
}

export function SiteSelector({ sites, activeSite, onSelect }: SiteSelectorProps) {
  return (
    <div className={styles.container}>
      {sites.map((site) => (
        <button
          key={site.slug}
          className={`${styles.site} ${site.slug === activeSite ? styles.active : ''}`}
          onClick={() => onSelect(site.slug)}
        >
          {site.name}
        </button>
      ))}
    </div>
  );
}
