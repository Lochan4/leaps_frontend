import { motion } from 'framer-motion';
import { Section } from '@/components/layout/Section';
import { Container } from '@/components/layout/Container';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/Label';
import { staggerContainer, fadeUp } from '@/animations/variants';
import { HERO } from '@/constants/content';
import styles from './Hero.module.css';

const VIEWPORT = { once: true };

export function Hero() {
  return (
    <Section id="hero" theme="light" className={styles.heroSection}>
      <Container>
        <motion.div
          className={styles.inner}
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={fadeUp}>
            <Label className={styles.label}>{HERO.label}</Label>
          </motion.div>

          <motion.h1 variants={fadeUp} className={styles.headline}>
            <span className={styles.headlineProblem}>
              {HERO.headlineProblem.split('\n').map((line, i, arr) => (
                <span key={i}>
                  {line}
                  {i < arr.length - 1 && <br />}
                </span>
              ))}
            </span>
            <br />
            <span className={styles.headlineSolution}>
              {HERO.headlineSolution.split('\n').map((line, i, arr) => (
                <span key={i}>
                  {line}
                  {i < arr.length - 1 && <br />}
                </span>
              ))}
            </span>
          </motion.h1>

          <motion.p variants={fadeUp} className={styles.subline}>
            {HERO.subline}
          </motion.p>

          <motion.div variants={fadeUp} className={styles.actions}>
            <Button href={HERO.ctaPrimary.href} variant="primary">
              {HERO.ctaPrimary.label}
            </Button>
            <Button href={HERO.ctaSecondary.href} variant="outline">
              {HERO.ctaSecondary.label}
            </Button>
          </motion.div>
        </motion.div>
      </Container>
    </Section>
  );
}
