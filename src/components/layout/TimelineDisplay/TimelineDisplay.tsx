import styles from './TimelineDisplay.module.css';

interface TimelineEntry {
  date: string;
  title: string;
  description: string;
}

interface TimelineDisplayProps {
  entries: TimelineEntry[];
}

export function TimelineDisplay({ entries }: TimelineDisplayProps) {
  return (
    <div className={styles.timeline}>
      {entries.map((entry) => (
        <div key={entry.date + entry.title} className={styles.entry}>
          <div className={styles.marker}>
            <span className={styles.dot} />
            <span className={styles.date}>{entry.date}</span>
          </div>
          <div className={styles.content}>
            <span className={styles.title}>{entry.title}</span>
            <p className={styles.desc}>{entry.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
