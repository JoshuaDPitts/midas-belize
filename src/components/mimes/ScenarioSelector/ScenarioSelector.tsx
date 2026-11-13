import type { Scenario } from '@/types/mimes';
import styles from './ScenarioSelector.module.css';

interface ScenarioSelectorProps {
  scenarios: Scenario[];
  activeId: string;
  onChange: (id: string) => void;
}

export function ScenarioSelector({ scenarios, activeId, onChange }: ScenarioSelectorProps) {
  return (
    <div className={styles.container}>
      {scenarios.map((s) => (
        <button
          key={s.id}
          className={`${styles.card} ${s.id === activeId ? styles.active : ''}`}
          data-active={s.id === activeId}
          onClick={() => onChange(s.id)}
        >
          <span className={styles.name}>{s.name}</span>
          <span className={styles.desc}>{s.description}</span>
        </button>
      ))}
    </div>
  );
}
