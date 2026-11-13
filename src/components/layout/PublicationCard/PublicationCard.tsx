import styles from './PublicationCard.module.css';

interface PublicationCardProps {
  title: string;
  authors: string[];
  year: number;
  journal: string;
  doi?: string;
  pdfUrl?: string;
}

export function PublicationCard({ title, authors, year, journal, doi, pdfUrl }: PublicationCardProps) {
  return (
    <div className={styles.card}>
      <span className={styles.title}>{title}</span>
      <span className={styles.authors}>{authors.join(', ')}</span>
      <span className={styles.meta}>{journal} ({year})</span>
      <div className={styles.links}>
        {doi && <a href={`https://doi.org/${doi}`} className={styles.link} target="_blank" rel="noopener noreferrer">{doi}</a>}
        {pdfUrl && <a href={pdfUrl} className={styles.pdfLink} target="_blank" rel="noopener noreferrer">PDF</a>}
      </div>
    </div>
  );
}
