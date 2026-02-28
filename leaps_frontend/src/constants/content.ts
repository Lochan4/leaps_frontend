/**
 * Centralized content store.
 * All copy lives here — components are just layout.
 * Edit this file to change any visible text on the page.
 */

export const NAV = {
  wordmark: 'leaps',
  wordmarkSup: '^',
  links: [
    { label: 'How it works', href: '#how' },
    { label: 'Capabilities', href: '#capabilities' },
    { label: 'Pricing', href: '#pricing' },
  ],
  cta: { label: 'Get Early Access', href: '#cta' },
};

export const HERO = {
  label: 'AI Job Search Agent',
  headlineProblem: 'Stop applying\nfor jobs.',
  headlineSolution: 'Leaps applies\nfor them.',
  subline:
    'Set your direction once. Leaps reads roles, rewrites your positioning, and submits — while you focus on the work that matters.',
  ctaPrimary: { label: 'Get Early Access', href: '#cta' },
  ctaSecondary: { label: 'See how it works\u00a0↓', href: '#outcomes' },
};

export const OUTCOMES = {
  label: 'What changes',
  headline: 'A different relationship\nwith job searching.',
  items: [
    { number: '01', text: 'Resume aligned to every role, automatically.' },
    { number: '02', text: 'Applications submitted while you work, sleep, rest.' },
    { number: '03', text: 'Six portals monitored. Nothing missed.' },
    { number: '04', text: 'Market signals delivered. Every week.' },
  ],
};

export const PAIN = {
  label: 'The cost',
  headline: 'You already know\nthis feeling.',
  statements: [
    'Re-editing the same resume for the fourth time this week.',
    'Checking three different portals for the same company.',
    'Writing a cover letter at midnight — for a role you are not even certain about.',
    'Getting filtered before a human reads your name.',
  ],
  closer: 'It does not have to be this way.',
};

export const TRANSFORMATION = {
  label: 'The shift',
  headline: 'One profile.\nInfinite alignment.',
  lines: [
    'Leaps reads each job description with intent.',
    'Rewrites your positioning to match the signal.',
    'Submits with context and timing.',
    'Tracks every response — you check in when you want to.',
  ],
  closer: 'The loop runs whether you are working or not.',
};

export interface CapabilityItem {
  name: string;
  description: string;
}

export interface System {
  number: string;
  name: string;
  tagline: string;
  capabilities: CapabilityItem[];
}

export const CAPABILITIES = {
  label: 'The architecture',
  headline: 'Three systems.\nOne continuous loop.',
  systems: [
    {
      number: '01',
      name: 'Alignment Engine',
      tagline: 'Your profile, positioned for every role.',
      capabilities: [
        {
          name: 'ATS Score',
          description: 'Resume compatibility scored, explained, and actionable.',
        },
        {
          name: 'RoleFit Insights',
          description: 'Keyword mapping against your target roles and seniority.',
        },
        {
          name: 'CoverTailor',
          description: 'Generated per role. Never from a template.',
        },
      ],
    },
    {
      number: '02',
      name: 'Application Automation',
      tagline: 'Submissions happen. You stay focused.',
      capabilities: [
        {
          name: 'Portal Connect',
          description: 'Six major platforms. One configuration.',
        },
        {
          name: 'AutoApply',
          description: 'Background submissions, up to 50 per week on Pro.',
        },
        {
          name: 'Smart Filtering',
          description: 'Leaps applies only where the fit is real.',
        },
      ],
    },
    {
      number: '03',
      name: 'Feedback Loop',
      tagline: 'Market signals, continuously delivered.',
      capabilities: [
        {
          name: 'Pulse Updates',
          description: 'Every submission confirmed. Email and Slack.',
        },
        {
          name: 'Market Fit',
          description: 'Weekly analysis of how your profile performs.',
        },
        {
          name: 'Ratio Tracking',
          description: 'Track what lands. Refine what does not.',
        },
      ],
    },
  ] as System[],
};

export const HOW_IT_WORKS = {
  label: 'Three decisions',
  headline: 'Then Leaps runs.',
  steps: [
    {
      number: '01',
      title: 'Upload your resume',
      description: 'Paste a link or upload a file. Parsed in seconds.',
    },
    {
      number: '02',
      title: 'Set your direction',
      description: 'Roles, locations, seniority, and which portals to target.',
    },
    {
      number: '03',
      title: 'Choose your level',
      description: 'Review everything. Approve nothing. Or somewhere between.',
    },
  ],
  closer:
    'After that, Leaps runs continuously. Applications submitted in background. Feedback delivered weekly. You check in when you want to.',
};

export interface PricingFeature {
  text: string;
  included: boolean;
}

export interface PricingTier {
  name: string;
  price: string;
  cadence: string;
  featured: boolean;
  features: PricingFeature[];
  cta: { label: string; href: string };
}

export const PRICING = {
  label: 'Pricing',
  headline: 'Simple. Honest.',
  subline: 'No lock-in. Cancel anytime. Upgrade when it is working.',
  tiers: [
    {
      name: 'Starter',
      price: 'Free',
      cadence: 'No credit card required',
      featured: false,
      features: [
        { text: 'ATS Score — 3 scans / month', included: true },
        { text: 'RoleFit Insights — 2 roles', included: true },
        { text: 'CoverTailor — 2 letters', included: true },
        { text: 'AutoApply', included: false },
        { text: 'Portal Connect', included: false },
        { text: 'Pulse Updates', included: false },
      ],
      cta: { label: 'Start Free', href: '#cta' },
    },
    {
      name: 'Pro',
      price: '$29',
      cadence: 'per month',
      featured: true,
      features: [
        { text: 'Unlimited ATS scans', included: true },
        { text: 'Unlimited RoleFit Insights', included: true },
        { text: 'Unlimited CoverTailor letters', included: true },
        { text: 'AutoApply — up to 50 / week', included: true },
        { text: 'Portal Connect — all 6+ portals', included: true },
        { text: 'Pulse Updates — email + Slack', included: true },
      ],
      cta: { label: 'Get Early Access', href: '#cta' },
    },
    {
      name: 'Teams',
      price: '$99',
      cadence: 'per month · up to 5 seats',
      featured: false,
      features: [
        { text: 'Everything in Pro', included: true },
        { text: 'Team analytics dashboard', included: true },
        { text: 'Shared portal credentials', included: true },
        { text: 'AutoApply — unlimited', included: true },
        { text: 'Priority support', included: true },
        { text: 'Dedicated onboarding session', included: true },
      ],
      cta: { label: 'Contact Us', href: 'mailto:hello@leaps.to' },
    },
  ] as PricingTier[],
};

export const CTA = {
  label: 'Early Access',
  headline: 'Ready when\nyou are.',
  subline: 'First batch invited this quarter. No spam. No lock-in. Just the platform.',
  inputPlaceholder: 'your@email.com',
  buttonLabel: 'Join Waitlist',
  confirmation: 'You are on the list.',
};

export const FOOTER = {
  wordmark: 'leaps',
  tagline: 'Job applications, automated.',
  links: [
    { label: 'Capabilities', href: '#capabilities' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'Contact', href: 'mailto:hello@leaps.to' },
  ],
  copy: '© 2025 Leaps. All rights reserved.',
};
