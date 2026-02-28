import { motion } from 'framer-motion';
import { Section } from '@/components/layout/Section';
import { Container } from '@/components/layout/Container';
import { Label } from '@/components/ui/Label';
import { staggerContainer, fadeUp, slideLeft, drawLine } from '@/animations/variants';
import { CAPABILITIES } from '@/constants/content';
import styles from './Capabilities.module.css';

const VIEWPORT = { once: true, margin: '-60px' };

export function Capabilities() {
  return (
    <Section id="capabilities" theme="light">
      <Container>
        {/* Section header */}
        <motion.div
          className={styles.header}
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT}
        >
          <motion.div variants={fadeUp}>
            <Label>{CAPABILITIES.label}</Label>
          </motion.div>
          <motion.h2 variants={fadeUp} className={styles.headline}>
            {CAPABILITIES.headline.split('\n').map((line, i, arr) => (
              <span key={i}>
                {line}
                {i < arr.length - 1 && <br />}
              </span>
            ))}
          </motion.h2>
        </motion.div>

        {/* Systems */}
        <div className={styles.systems}>
          {CAPABILITIES.systems.map((system) => (
            <motion.div
              key={system.number}
              className={styles.system}
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={VIEWPORT}
            >
              {/* System header row — number + name + extending rule */}
              <div className={styles.systemHeaderRow}>
                <motion.span variants={fadeUp} className={styles.systemNumber}>
                  {system.number}
                </motion.span>
                <motion.span variants={fadeUp} className={styles.systemName}>
                  {system.name}
                </motion.span>
                <motion.div
                  className={styles.systemRule}
                  variants={drawLine}
                  style={{ transformOrigin: 'left center' }}
                />
              </div>

              {/* Tagline */}
              <motion.p variants={fadeUp} className={styles.systemTagline}>
                {system.tagline}
              </motion.p>

              {/* Capability rows */}
              <div className={styles.capabilities}>
                {system.capabilities.map((cap, idx) => (
                  <motion.div
                    key={cap.name}
                    variants={fadeUp}
                    className={styles.capability}
                  >
                    <span className={styles.capName}>{cap.name}</span>
                    <span className={styles.capDesc}>{cap.description}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </Container>
    </Section>
  );
}
