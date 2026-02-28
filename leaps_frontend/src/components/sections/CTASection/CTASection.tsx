import { useState } from 'react';
import { motion } from 'framer-motion';
import { Section } from '@/components/layout/Section';
import { Container } from '@/components/layout/Container';
import { Label } from '@/components/ui/Label';
import { staggerContainer, fadeUp } from '@/animations/variants';
import { CTA } from '@/constants/content';
import styles from './CTASection.module.css';

const VIEWPORT = { once: true, margin: '-60px' };

export function CTASection() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) return;
    setSubmitted(true);
    setEmail('');
  };

  return (
    <Section id="cta" theme="dark">
      <Container narrow>
        <motion.div
          className={styles.inner}
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT}
        >
          <motion.div variants={fadeUp}>
            <Label>{CTA.label}</Label>
          </motion.div>

          <motion.h2 variants={fadeUp} className={styles.headline}>
            {CTA.headline.split('\n').map((line, i, arr) => (
              <span key={i}>
                {line}
                {i < arr.length - 1 && <br />}
              </span>
            ))}
          </motion.h2>

          <motion.p variants={fadeUp} className={styles.subline}>
            {CTA.subline}
          </motion.p>

          <motion.form
            variants={fadeUp}
            className={styles.form}
            onSubmit={handleSubmit}
          >
            {!submitted ? (
              <>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={CTA.inputPlaceholder}
                  className={styles.input}
                  aria-label="Email address"
                  required
                />
                <button type="submit" className={styles.btn}>
                  {CTA.buttonLabel}
                </button>
              </>
            ) : (
              <motion.div
                className={styles.confirmation}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                {CTA.confirmation}
              </motion.div>
            )}
          </motion.form>
        </motion.div>
      </Container>
    </Section>
  );
}
