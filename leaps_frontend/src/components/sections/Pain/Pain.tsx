import { motion } from 'framer-motion';
import { Section } from '@/components/layout/Section';
import { Container } from '@/components/layout/Container';
import { Label } from '@/components/ui/Label';
import { staggerContainer, fadeUp } from '@/animations/variants';
import { PAIN } from '@/constants/content';
import styles from './Pain.module.css';

const VIEWPORT = { once: true, margin: '-60px' };

export function Pain() {
  return (
    <Section id="pain" theme="light">
      <Container narrow>
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT}
        >
          <motion.div variants={fadeUp}>
            <Label>{PAIN.label}</Label>
          </motion.div>

          <motion.h2 variants={fadeUp} className={styles.headline}>
            {PAIN.headline.split('\n').map((line, i, arr) => (
              <span key={i}>
                {line}
                {i < arr.length - 1 && <br />}
              </span>
            ))}
          </motion.h2>

          <div className={styles.statements}>
            {PAIN.statements.map((statement, idx) => (
              <motion.p
                key={idx}
                variants={fadeUp}
                className={styles.statement}
                style={{ transitionDelay: `${idx * 60}ms` }}
              >
                {statement}
              </motion.p>
            ))}
          </div>

          <motion.div variants={fadeUp} className={styles.closer}>
            <div className={styles.closerRule} />
            <p className={styles.closerText}>{PAIN.closer}</p>
          </motion.div>
        </motion.div>
      </Container>
    </Section>
  );
}
