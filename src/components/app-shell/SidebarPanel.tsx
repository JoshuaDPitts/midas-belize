'use client';
import type { ReactElement } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { sidebarPanelAtom, sidebarPanelWidthAtom, type SidebarPanel as PanelId } from '@/atoms';
import { Icon } from '@/lib/icons';
import { useResponsive } from './hooks/useResponsive';
import { BottomSheet } from './BottomSheet';
import { LayersTab } from './panels/LayersTab';
import { InspectTab } from './panels/InspectTab';
import { ScenariosTab } from './panels/ScenariosTab';
import { DomainTab } from './panels/DomainTab';
import styles from './SidebarPanel.module.css';

const TITLES: Record<PanelId, string> = {
  layers: 'Layers',
  inspect: 'Inspect',
  scenarios: 'Scenarios',
  domain: 'Domain',
};

const BODIES: Record<PanelId, () => ReactElement | null> = {
  layers: LayersTab,
  inspect: InspectTab,
  scenarios: ScenariosTab,
  domain: DomainTab,
};

export function SidebarPanel() {
  const [active, setActive] = useAtom(sidebarPanelAtom);
  const isNarrow = useResponsive();
  const width = useAtomValue(sidebarPanelWidthAtom);
  if (active === null) return null;

  const Body = BODIES[active];
  const inner = (
    <>
      <header className={styles.header}>
        <span className={styles.title}>{TITLES[active]}</span>
        <button
          type="button"
          className={styles.close}
          data-testid="appshell-panel-close"
          aria-label="Close panel"
          onClick={() => setActive(null)}
        >
          <Icon name="x" size={14} />
        </button>
      </header>
      <div className={styles.body}>
        <Body />
      </div>
    </>
  );

  if (isNarrow) {
    return (
      <BottomSheet open onClose={() => setActive(null)}>
        <div data-testid="appshell-sidebar-panel">{inner}</div>
      </BottomSheet>
    );
  }
  return (
    <aside
      className={styles.panel}
      data-testid="appshell-sidebar-panel"
      aria-label={`${TITLES[active]} panel`}
      style={{ width: `${width}px` }}
    >
      {inner}
    </aside>
  );
}
