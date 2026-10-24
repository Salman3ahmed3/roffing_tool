import { describe, expect, it } from 'vitest';
import { SCROLL_KEYS, activationLine, activeIndex, resolveLocked } from '../src/lib/scrollspy';

describe('activeIndex', () => {
  const line = 225; // 25% of a 900px viewport
  it('highlights the first item at the top of the article', () => {
    expect(activeIndex([400, 1200, 2000], line, false)).toBe(0);
  });
  it('picks the last heading that has passed the line', () => {
    expect(activeIndex([-800, 100, 900], line, false)).toBe(1);
    expect(activeIndex([-800, -100, 225], line, false)).toBe(2);
    expect(activeIndex([-800, -100, 226], line, false)).toBe(1);
  });
  it('highlights the last item at the bottom of the page, even below the line', () => {
    expect(activeIndex([-900, -300, 500], line, true)).toBe(2);
  });
  it('handles an empty TOC', () => {
    expect(activeIndex([], line, false)).toBe(-1);
  });
  it('works scrolling back up', () => {
    const down = activeIndex([-1500, -700, 50], line, false);
    const up = activeIndex([-300, 500, 1300], line, false);
    expect([down, up]).toEqual([2, 0]);
  });
});

describe('activationLine', () => {
  it('is 25% down the viewport, below a sticky header', () => {
    expect(activationLine(900)).toBe(225);
    expect(activationLine(900, 60)).toBe(270);
  });
});

describe('resolveLocked', () => {
  it('passes the computed section through when nothing is locked', () => {
    expect(resolveLocked(3, null)).toBe(3);
  });
  it('keeps the clicked item while the scroll passes other sections', () => {
    expect(resolveLocked(1, 4)).toBe(4);
    expect(resolveLocked(2, 4)).toBe(4);
  });
  it('keeps the clicked item when a short section lands with the next heading above the line', () => {
    // Clicked "Method 3" (3); after landing, "Safety" (4) is also above the line.
    expect(resolveLocked(4, 3)).toBe(3);
  });
  it('hands back on page-scrolling keys only', () => {
    expect(SCROLL_KEYS.has('PageDown')).toBe(true);
    expect(SCROLL_KEYS.has('Tab')).toBe(false);
    expect(SCROLL_KEYS.has('Enter')).toBe(false);
  });
});
