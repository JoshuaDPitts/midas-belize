'use client';
import { useAtom } from 'jotai';
import { sidebarPanelAtom, type SidebarPanel } from '@/atoms';
import { Icon } from '@/lib/icons';
import { useFeatures } from './hooks/useFeatures';
import styles from './SidebarRail.module.css';

const ICONS: Record<SidebarPanel, { iconName: string; aria: string }> = {
  layers:    { iconName: 'layers',    aria: 'Layers' },
  inspect:   { iconName: 'crosshair', aria: 'Inspect' },
  scenarios: { iconName: 'sliders',   aria: 'Scenarios' },
  domain:    { iconName: 'sparkles',  aria: 'Domain' },
};

export function SidebarRail() {
  const [active, setActive] = useAtom(sidebarPanelAtom);
  const features = useFeatures();

  const showScenarios = features.some((f) => f.scenariosContent);
  const showDomain = features.some((f) => f.domainContent);

  const visible: SidebarPanel[] = ['layers', 'inspect'];
  if (showScenarios) visible.push('scenarios');
  if (showDomain) visible.push('domain');

  return (
    <nav className={styles.rail} aria-label="Sidebar tabs">
      {visible.map((id) => {
        const meta = ICONS[id];
        const isActive = active === id;
        return (
          <button
            key={id}
            type="button"
            className={styles.icon}
            data-testid={`rail-icon-${id}`}
            data-active={isActive}
            aria-label={meta.aria}
            onClick={() => setActive(isActive ? null : id)}
          >
            <Icon name={meta.iconName} size={18} />
          </button>
        );
      })}
    </nav>
  );
}
