import styles from './CategoricalLegend.module.css';

interface Category {
  label: string;
  color: string;
}

interface CategoricalLegendProps {
  categories: Category[];
  label: string;
}

export function CategoricalLegend({ categories, label }: CategoricalLegendProps) {
  return (
    <div className={styles.container}>
      <span className={styles.title}>{label}</span>
      <div className={styles.list}>
        {categories.map((cat) => (
          <div key={cat.label} className={styles.item} data-swatch>
            <span className={styles.swatch} style={{ backgroundColor: cat.color }} />
            <span className={styles.label}>{cat.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
