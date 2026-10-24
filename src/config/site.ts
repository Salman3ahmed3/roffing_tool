/**
 * Site-wide settings. No placeholders: a test fails the build if "[Something]" reaches a page.
 *
 * There is no expert reviewer yet. Don't add reviewer names, credentials, "verified" or
 * "last reviewed" claims (on pages or in JSON-LD) until a real review has happened.
 */
export const SITE = {
  brand: 'ExteriorMath',
  /** Shown in the legal pages; canonical URLs come from astro.config.mjs. */
  siteUrl: 'https://exteriormath.com',
  tagline: 'Free roofing, fence and deck calculators. Calculations run in your browser; nothing you enter is stored.',
  /** Writes and maintains the calculators and content. */
  author: 'Salman Ahmed',
  /** Owns and operates the site (named in the terms and privacy policy). */
  owner: 'Sawera Nadeem',
  contactEmail: 'exteriormath@gmail.com',
  /** Governing law for the terms of use. */
  jurisdiction: 'Pakistan',
  /** Effective date of the privacy policy and terms (ISO). */
  legalEffective: '2026-10-26',
  hosting: 'Hostinger',
  locale: 'en_US',
  ogImage: '/og-default.png',
} as const;

/** Feature flags. Keep these off until real data / partners exist. */
export const FLAGS = {
  /** Cost-range card on the materials tool. Off until real regional pricing is supplied. */
  showCostCard: false,
  /** "Get 3 quotes" CTA. Off (rendered disabled/hidden) until a lead partner exists. */
  showQuotesCta: false,
} as const;

export interface NavTool {
  name: string;
  href: string;
  desc: string;
  icon: string;
  trade: 'Roofing' | 'Outdoor';
}

export const TOOLS: NavTool[] = [
  {
    name: 'Roof Pitch',
    href: '/roof-pitch-calculator/',
    desc: 'Pitch, angle, slope % and rafter multiplier from rise and run.',
    icon: 'M3 19h18V6L3 19z M8 19a5 5 0 0 0-1-3',
    trade: 'Roofing',
  },
  {
    name: 'Roofing Materials',
    href: '/roofing-calculator/',
    desc: 'Squares, bundles, underlayment and drip edge.',
    icon: 'M2 10L12 4l10 6 M4 9v10h16V9 M4 14h16 M9 9v5 M15 9v5 M12 14v5',
    trade: 'Roofing',
  },
  {
    name: 'Fence',
    href: '/fence-calculator/',
    desc: 'Posts, rails, pickets and concrete for any run length.',
    icon: 'M5 21V6l2-2 2 2v15 M15 21V6l2-2 2 2v15 M2 10h20 M2 16h20',
    trade: 'Outdoor',
  },
  {
    name: 'Deck',
    href: '/deck-calculator/',
    desc: 'Boards, joists and screws for a rectangular deck.',
    icon: 'M2 8h20v4H2z M4 12v8 M20 12v8 M12 12v8 M2 16h20',
    trade: 'Outdoor',
  },
];

export const COMPANY_LINKS = [
  { name: 'Home', href: '/' },
  { name: 'About', href: '/about/' },
  { name: 'Contact', href: '/contact/' },
  { name: 'Privacy', href: '/privacy/' },
  { name: 'Terms', href: '/terms/' },
  { name: 'Methodology', href: '/methodology/' },
];

export const GUIDE_LINKS = [{ name: 'Measuring roof pitch', href: '/guides/how-to-measure-roof-pitch/' }];
