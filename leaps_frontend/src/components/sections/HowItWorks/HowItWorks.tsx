import { motion } from 'framer-motion';
import { Section } from '@/components/layout/Section';
import { Container } from '@/components/layout/Container';
import { Label } from '@/components/ui/Label';
import { staggerContainer, fadeUp, drawLine } from '@/animations/variants';
import { HOW_IT_WORKS } from '@/constants/content';
import styles from './HowItWorks.module.css';

const VIEWPORT = { once: true, margin: '-60px' };

export function HowItWorks() {
  return (
    <Section id="how" theme="dark">
      <Container>
        <div className={styles.layout}>
          {/* Left — heading */}
          <motion.div
            className={styles.left}
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={VIEWPORT}
          >
            <motion.div variants={fadeUp}>
              <Label>{HOW_IT_WORKS.label}</Label>
            </motion.div>
            <motion.h2 variants={fadeUp} className={styles.headline}>
              {HOW_IT_WORKS.headline}
            </motion.h2>
          </motion.div>

          {/* Right — steps + closer */}
          <div className={styles.right}>
            <motion.div
              className={styles.steps}
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={VIEWPORT}
            >
              {HOW_IT_WORKS.steps.map((step) => (
                <motion.div key={step.number} className={styles.step} variants={fadeUp}>
                  <div className={styles.stepHeader}>
                    <span className={styles.stepNumber}>{step.number}</span>
                    <motion.div
                      className={styles.stepRule}
                      variants={drawLine}
                      style={{ transformOrigin: 'left center' }}
                    />
                  </div>
                  <h3 className={styles.stepTitle}>{step.title}</h3>
                  <p className={styles.stepDesc}>{step.description}</p>
                </motion.div>
              ))}
            </motion.div>

            <motion.div
              className={styles.closer}
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={VIEWPORT}
            >
              <motion.div
                className={styles.closerRule}
                variants={drawLine}
                style={{ transformOrigin: 'left center' }}
              />
              <motion.p variants={fadeUp} className={styles.closerText}>
                {HOW_IT_WORKS.closer}
              </motion.p>
            </motion.div>
          </div>
        </div>
      </Container>
    </Section>
  );
}
