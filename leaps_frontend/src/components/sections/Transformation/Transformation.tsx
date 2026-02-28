import { motion } from 'framer-motion';
import { Section } from '@/components/layout/Section';
import { Container } from '@/components/layout/Container';
import { Label } from '@/components/ui/Label';
import { staggerContainer, fadeUp, slideLeft, slideRight } from '@/animations/variants';
import { TRANSFORMATION } from '@/constants/content';
import styles from './Transformation.module.css';

const VIEWPORT = { once: true, margin: '-80px' };

export function Transformation() {
  return (
    <Section id="transformation" theme="dark">
      <Container>
        <div className={styles.layout}>
          {/* Left — headline column */}
          <motion.div
            className={styles.left}
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={VIEWPORT}
          >
            <motion.div variants={fadeUp}>
              <Label>{TRANSFORMATION.label}</Label>
            </motion.div>

            <motion.h2 variants={slideLeft} className={styles.headline}>
              {TRANSFORMATION.headline.split('\n').map((line, i, arr) => (
                <span key={i}>
                  {line}
                  {i < arr.length - 1 && <br />}
                </span>
              ))}
            </motion.h2>
          </motion.div>

          {/* Right — body lines */}
          <motion.div
            className={styles.right}
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={VIEWPORT}
          >
            <div className={styles.lines}>
              {TRANSFORMATION.lines.map((line, idx) => (
                <motion.p
                  key={idx}
                  variants={slideRight}
                  className={styles.line}
                >
                  {line}
                </motion.p>
              ))}
            </div>

            <motion.p variants={fadeUp} className={styles.closer}>
              {TRANSFORMATION.closer}
            </motion.p>
          </motion.div>
        </div>
      </Container>
    </Section>
  );
}
