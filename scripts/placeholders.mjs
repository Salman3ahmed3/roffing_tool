/**
 * Finds unfilled "[Something]" placeholders in built HTML, including JSON-LD.
 * Ignored: markdown-style links "[text](url)", lowercase/numeric brackets such as array indexes or
 * CSS attribute selectors, and the contents of ordinary <script> and <style> elements.
 */

const PLACEHOLDER = /\[([A-Z][^[\]\n<>]{0,119})\](?!\()/g;

/** Text that a visitor or a search engine can see: page markup plus JSON-LD, minus code and styles. */
export function visibleSource(html) {
  return html
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi, (_m, attrs, body) => (/application\/ld\+json/i.test(attrs) ? ` ${body} ` : ' '));
}

/** All placeholder strings found in a page, e.g. ["[Review date]"]. */
export function findPlaceholders(html) {
  return [...visibleSource(html).matchAll(PLACEHOLDER)].map((m) => m[0]);
}
