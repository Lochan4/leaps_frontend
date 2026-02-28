import { motion } from 'framer-motion';
import { Section } from '@/components/layout/Section';
import { Container } from '@/components/layout/Container';
import { Label } from '@/components/ui/Label';
import { staggerContainer, fadeUp, slideLeft, drawLine } from '@/animations/variants';
import { OUTCOMES } from '@/constants/content';
import styles from './Outcomes.module.css';

const VIEWPORT = { once: true, margin: '-80px' };

export function Outcomes() {
  return (
    <Section id="outcomes" theme="dark">
      <Container>
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT}
        >
          <motion.div variants={fadeUp}>
            <Label>{OUTCOMES.label}</Label>
          </motion.div>

          <motion.h2 variants={fadeUp} className={styles.headline}>
            {OUTCOMES.headline.split('\n').map((line, i, arr) => (
              <span key={i}>
                {line}
                {i < arr.length - 1 && <br />}
              </span>
            ))}
          </motion.h2>
        </motion.div>

        <div className={styles.items}>
          {OUTCOMES.items.map((item, idx) => (
            <motion.div
              key={item.number}
              className={styles.item}
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={VIEWPORT}
            >
              {/* Animated rule line */}
              <motion.div
                className={styles.rule}
                variants={drawLine}
                style={{ transformOrigin: 'left center' }}
              />

              <div className={styles.itemInner}>
                <motion.span variants={fadeUp} className={styles.number}>
                  {item.number}
                </motion.span>
                <motion.p variants={slideLeft} className={styles.text}>
                  {item.text}
                </motion.p>
              </div>
            </motion.div>
          ))}

          {/* Closing rule */}
          <motion.div
            className={styles.rule}
            variants={drawLine}
            initial="hidden"
            whileInView="visible"
            viewport={VIEWPORT}
            style={{ transformOrigin: 'left center' }}
          />
        </div>
      </Container>
    </Section>
  );
}
