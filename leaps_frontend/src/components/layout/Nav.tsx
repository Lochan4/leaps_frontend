import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/cn';
import { NAV } from '@/constants/content';
import styles from './Nav.module.css';

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 48);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const closeMenu = () => setMenuOpen(false);

  return (
    <>
      <nav className={cn(styles.nav, scrolled && styles.scrolled)}>
        <a href="#hero" className={styles.wordmark} onClick={closeMenu}>
          {NAV.wordmark}
          <sup className={styles.wordmarkSup}>{NAV.wordmarkSup}</sup>
        </a>

        <ul className={styles.links}>
          {NAV.links.map((link) => (
            <li key={link.href}>
              <a href={link.href} className={styles.link}>
                {link.label}
              </a>
            </li>
          ))}
          <li>
            <a href={NAV.cta.href} className={cn(styles.link, styles.cta)}>
              {NAV.cta.label}
            </a>
          </li>
        </ul>

        <button
          className={cn(styles.hamburger, menuOpen && styles.hamburgerOpen)}
          onClick={() => setMenuOpen((o) => !o)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
        >
          <span />
          <span />
          <span />
        </button>
      </nav>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            className={styles.mobileMenu}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
          >
            {NAV.links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={styles.mobileLink}
                onClick={closeMenu}
              >
                {link.label}
              </a>
            ))}
            <a
              href={NAV.cta.href}
              className={styles.mobileCta}
              onClick={closeMenu}
            >
              {NAV.cta.label}
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
