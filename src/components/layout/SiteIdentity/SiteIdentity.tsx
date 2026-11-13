import styles from './SiteIdentity.module.css';

interface SiteIdentityProps {
  logos: { src: string; alt: string; href: string }[];
}

export function SiteIdentity({ logos }: SiteIdentityProps) {
  return (
    <div className={styles.container}>
      {logos.map((logo) => (
        <a key={logo.href} href={logo.href} className={styles.logoLink} target="_blank" rel="noopener noreferrer">
          <img src={logo.src} alt={logo.alt} className={styles.logo} />
        </a>
      ))}
    </div>
  );
}
