import styles from './Footer.module.css';

interface FooterProps {
  navItems: { label: string; href: string }[];
  logos: { src: string; alt: string; href: string }[];
}

export function Footer({ navItems, logos }: FooterProps) {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.links}>
          {navItems.map((item) => (
            <a key={item.href} href={item.href} className={styles.link}>{item.label}</a>
          ))}
        </div>
        {logos.length > 0 && (
          <div className={styles.logos}>
            {logos.map((logo) => (
              <a key={logo.href} href={logo.href} target="_blank" rel="noopener noreferrer">
                <img src={logo.src} alt={logo.alt} className={styles.logo} />
              </a>
            ))}
          </div>
        )}
        <span className={styles.copyright}>&copy; {new Date().getFullYear()} MIDAS Belize</span>
      </div>
    </footer>
  );
}
