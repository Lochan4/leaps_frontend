import { FOOTER } from '@/constants/content';
import styles from './Footer.module.css';

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.left}>
        <div className={styles.wordmark}>
          {FOOTER.wordmark}
          <sup className={styles.wordmarkSup}>^</sup>
        </div>
        <div className={styles.tagline}>{FOOTER.tagline}</div>
      </div>

      <ul className={styles.links}>
        {FOOTER.links.map((link) => (
          <li key={link.href}>
            <a href={link.href} className={styles.link}>
              {link.label}
            </a>
          </li>
        ))}
      </ul>

      <div className={styles.copy}>{FOOTER.copy}</div>
    </footer>
  );
}
