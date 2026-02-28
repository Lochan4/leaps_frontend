import { Nav } from '@/components/layout/Nav';
import { Footer } from '@/components/layout/Footer';
import { Hero } from '@/components/sections/Hero/Hero';
import { Outcomes } from '@/components/sections/Outcomes/Outcomes';
import { Pain } from '@/components/sections/Pain/Pain';
import { Transformation } from '@/components/sections/Transformation/Transformation';
import { Capabilities } from '@/components/sections/Capabilities/Capabilities';
import { HowItWorks } from '@/components/sections/HowItWorks/HowItWorks';
import { Pricing } from '@/components/sections/Pricing/Pricing';
import { CTASection } from '@/components/sections/CTASection/CTASection';

/**
 * App — defines the scroll narrative.
 *
 * Section theme alternation (light → dark → light → ...):
 *   Hero          light   — identity, bold restraint
 *   Outcomes      dark    — calm inevitability
 *   Pain          light   — relatable, human
 *   Transformation dark   — turning point
 *   Capabilities  light   — architecture, structured
 *   HowItWorks    dark    — decisive, minimal
 *   Pricing       light   — confident, clean
 *   CTA           dark    — invitation, quiet urgency
 */
export default function App() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Outcomes />
        <Pain />
        <Transformation />
        <Capabilities />
        <HowItWorks />
        <Pricing />
        <CTASection />
      </main>
      <Footer />
    </>
  );
}
