/**
 * Active-section rule for the guide table of contents.
 *
 * `tops` are the headings' current distances from the top of the viewport (getBoundingClientRect().top),
 * in document order. `line` is the activation line in the same coordinates (about 25% down the
 * part of the viewport below any sticky header).
 *
 * - Active = the last heading whose top has reached the line.
 * - Above the first heading (top of the article): the first item.
 * - At the bottom of the page: the last item, even if its heading never reaches the line.
 */
export function activeIndex(tops: readonly number[], line: number, atBottom: boolean): number {
  if (tops.length === 0) return -1;
  if (atBottom) return tops.length - 1;
  let active = 0;
  for (let i = 0; i < tops.length; i++) {
    if (tops[i] <= line) active = i;
    else break;
  }
  return active;
}

/** Activation line: `ratio` of the way down the viewport area below a sticky header of height `offset`. */
export function activationLine(viewportHeight: number, offset = 0, ratio = 0.25): number {
  return Math.round(offset + (viewportHeight - offset) * ratio);
}

/**
 * After a TOC link is clicked, keep showing the clicked item, both during the smooth scroll (no
 * flicker through the sections in between) and after it lands. A short section can end up with the
 * next heading above the line too, but the reader asked for this one. The lock is cleared when the
 * reader scrolls by themselves.
 */
export function resolveLocked(computed: number, locked: number | null): number {
  return locked ?? computed;
}

/** Keys that scroll the page; pressing one hands control back to the scrollspy. */
export const SCROLL_KEYS = new Set(['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ']);
