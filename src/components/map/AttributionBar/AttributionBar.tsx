import styles from './AttributionBar.module.css';

interface AttributionBarProps {
  text: string;
}

export function AttributionBar({ text }: AttributionBarProps) {
  return <div className={styles.bar}>{text}</div>;
}
