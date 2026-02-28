import { motion } from 'framer-motion';
import { Section } from '@/components/layout/Section';
import { Container } from '@/components/layout/Container';
import { Label } from '@/components/ui/Label';
import { Button } from '@/components/ui/Button';
import { staggerContainer, fadeUp, scaleIn } from '@/animations/variants';
import { PRICING } from '@/constants/content';
import { cn } from '@/lib/cn';
import styles from './Pricing.module.css';

const VIEWPORT = { once: true, margin: '-60px' };

export function Pricing() {
  return (
    <Section id="pricing" theme="light">
      <Container>
        <motion.div
          className={styles.header}
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT}
        >
          <motion.div variants={fadeUp}>
            <Label>{PRICING.label}</Label>
          </motion.div>
          <motion.h2 variants={fadeUp} className={styles.headline}>
            {PRICING.headline}
          </motion.h2>
          <motion.p variants={fadeUp} className={styles.subline}>
            {PRICING.subline}
          </motion.p>
        </motion.div>

        <motion.div
          className={styles.grid}
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT}
        >
          {PRICING.tiers.map((tier) => (
            <motion.div
              key={tier.name}
              variants={scaleIn}
              className={cn(styles.card, tier.featured && styles.cardFeatured)}
            >
              <div className={styles.cardTop}>
                <div className={styles.tier}>{tier.name}</div>
                <div className={styles.price}>{tier.price}</div>
                <div className={styles.cadence}>{tier.cadence}</div>
              </div>

              <div className={styles.divider} />

              <ul className={styles.features}>
                {tier.features.map((feature, idx) => (
                  <li key={idx} className={styles.feature}>
                    <span className={cn(styles.check, !feature.included && styles.checkNa)}>
                      {feature.included ? '✓' : '—'}
                    </span>
                    <span className={cn(styles.featureText, !feature.included && styles.featureNa)}>
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>

              <Button
                href={tier.cta.href}
                variant={tier.featured ? 'primaryInvert' : 'outline'}
                className={styles.cta}
              >
                {tier.cta.label}
              </Button>
            </motion.div>
          ))}
        </motion.div>
      </Container>
    </Section>
  );
}
