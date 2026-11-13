import styles from './HeroSection.module.css';

interface HeroSectionProps {
  title: string;
  subtitle?: string;
  backgroundImage?: string;
}

export function HeroSection({ title, subtitle, backgroundImage }: HeroSectionProps) {
  return (
    <section className={styles.hero} style={backgroundImage ? { backgroundImage: `url(${backgroundImage})` } : undefined}>
      <div className={styles.overlay}>
        <h1 className={styles.title}>{title}</h1>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>
    </section>
  );
}
