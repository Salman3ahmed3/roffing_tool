/** JSON-LD builders. Pure functions so the output can be tested. */

export interface Crumb {
  name: string;
  /** Path such as "/roof-pitch-calculator/". Omit for a crumb that has no page of its own. */
  href?: string;
}

export interface Faq {
  q: string;
  /** Plain-text answer (also rendered as HTML on the page). */
  a: string;
}

export const absUrl = (site: string | URL, path: string) => new URL(path, site).toString();

export function breadcrumbLd(site: string | URL, crumbs: Crumb[], currentPath: string) {
  // Only crumbs that are real pages go into structured data; the last one is the current page.
  const linked = crumbs.filter((c, i) => c.href || i === crumbs.length - 1);
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: linked.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: absUrl(site, c.href ?? currentPath),
    })),
  };
}

export function faqLd(faqs: Faq[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}

export function webAppLd(opts: { site: string | URL; path: string; name: string; description: string; brand: string }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: opts.name,
    url: absUrl(opts.site, opts.path),
    description: opts.description,
    applicationCategory: 'UtilitiesApplication',
    operatingSystem: 'Any',
    browserRequirements: 'Requires JavaScript',
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    publisher: { '@type': 'Organization', name: opts.brand, url: absUrl(opts.site, '/') },
  };
}

/** Serialise for a <script type="application/ld+json"> tag; escapes "<" so content cannot close the tag. */
export function ldJson(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
