'use client';
import { useAtomValue } from 'jotai';
import { activeSiteAtom } from '@/atoms';
import { MarineHeroPanel } from './MarineHeroPanel';
import styles from './MarineDomainContent.module.css';

export function MarineDomainContent() {
  const activeSite = useAtomValue(activeSiteAtom);
  if (activeSite === null) {
    return (
      <div className={styles.container}>
        <p data-testid="marine-domain-pick-site" className={styles.prompt}>
          Pick a site to view its marine ecosystem analysis.
        </p>
      </div>
    );
  }
  return (
    <div className={styles.container}>
      <MarineHeroPanel />
    </div>
  );
}
