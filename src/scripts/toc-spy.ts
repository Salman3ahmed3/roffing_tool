/**
 * Scrollspy for the desktop "On this page" list on guide pages.
 * IntersectionObserver only (no scroll listeners): one observer fires whenever a heading crosses
 * the activation line, another notices the end of the page. The URL is never rewritten here;
 * clicking a link keeps the browser's normal hash navigation.
 */
import { SCROLL_KEYS, activationLine, activeIndex, resolveLocked } from '../lib/scrollspy';

export function initTocSpy(nav: HTMLElement): () => void {
  const links = Array.from(nav.querySelectorAll<HTMLAnchorElement>('a[href^="#"]'));
  const pairs = links
    .map((a) => ({ a, h: document.getElementById(decodeURIComponent(a.hash.slice(1))) }))
    .filter((p): p is { a: HTMLAnchorElement; h: HTMLElement } => p.h !== null);
  if (pairs.length === 0) return () => {};

  let current = -1;
  let locked: number | null = null;
  let atBottom = false;

  /** Height of a sticky/fixed header, if the site header is ever made sticky. */
  const headerOffset = () => {
    const h = document.querySelector<HTMLElement>('.site-header');
    if (!h) return 0;
    const pos = getComputedStyle(h).position;
    return pos === 'sticky' || pos === 'fixed' ? Math.max(0, h.getBoundingClientRect().bottom) : 0;
  };

  function show(i: number) {
    if (i === current || i < 0) return;
    current = i;
    pairs.forEach(({ a }, k) => {
      if (k === i) a.setAttribute('aria-current', 'location');
      else a.removeAttribute('aria-current');
    });
    if (i === 0) nav.scrollTop = 0;
    else keepVisible(pairs[i].a);
  }

  /** If the list scrolls (taller than the viewport), keep the active link inside it. */
  function keepVisible(a: HTMLElement) {
    if (nav.scrollHeight <= nav.clientHeight + 1) return;
    const n = nav.getBoundingClientRect();
    const r = a.getBoundingClientRect();
    const pad = 24;
    if (r.top < n.top + pad) nav.scrollTop -= n.top + pad - r.top;
    else if (r.bottom > n.bottom - pad) nav.scrollTop += r.bottom - (n.bottom - pad);
  }

  function update() {
    const line = activationLine(window.innerHeight, headerOffset());
    const computed = activeIndex(
      pairs.map(({ h }) => h.getBoundingClientRect().top),
      line,
      atBottom,
    );
    show(resolveLocked(computed, locked));
  }

  // Observer 1: the root area runs from far above the viewport down to the activation line, so a
  // heading's state flips exactly when it crosses the line, however fast the page scrolls.
  let headingObserver: IntersectionObserver | null = null;
  function observeHeadings() {
    headingObserver?.disconnect();
    const vh = window.innerHeight;
    const line = activationLine(vh, headerOffset());
    headingObserver = new IntersectionObserver(update, {
      rootMargin: `10000% 0px ${-(vh - line)}px 0px`,
      threshold: 0,
    });
    for (const { h } of pairs) headingObserver.observe(h);
  }

  // Observer 2: a 1px marker at the end of the page tells us we are at the bottom.
  const end = document.createElement('div');
  end.setAttribute('aria-hidden', 'true');
  end.style.cssText = 'height:1px;margin-top:-1px;pointer-events:none;';
  document.body.append(end);
  const endObserver = new IntersectionObserver((entries) => {
    atBottom = entries[entries.length - 1].isIntersecting;
    update();
  });
  endObserver.observe(end);

  // Clicking a link: mark it active now and keep it through the smooth scroll (no flicker through
  // the sections in between) and after landing. The lock ends when the reader scrolls themselves.
  const release = () => {
    if (locked === null) return;
    locked = null;
    update();
  };
  const onClick = (e: MouseEvent) => {
    const a = (e.target as Element).closest('a');
    const k = pairs.findIndex((p) => p.a === a);
    if (k < 0) return;
    locked = k;
    show(k);
  };
  nav.addEventListener('click', onClick);
  const userInput = ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const;
  const onInput = (e: Event) => {
    // Clicks inside the TOC set the lock themselves; Tab/Enter don't scroll the page.
    if (e.type === 'pointerdown' && nav.contains(e.target as Node)) return;
    if (e.type === 'keydown' && !SCROLL_KEYS.has((e as KeyboardEvent).key)) return;
    release();
  };
  for (const t of userInput) window.addEventListener(t, onInput, { passive: true });

  let resizeTimer = 0;
  const onResize = () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      observeHeadings();
      update();
    }, 150);
  };
  window.addEventListener('resize', onResize);

  observeHeadings();
  update();

  return () => {
    headingObserver?.disconnect();
    endObserver.disconnect();
    end.remove();
    nav.removeEventListener('click', onClick);
    for (const t of userInput) window.removeEventListener(t, onInput);
    window.removeEventListener('resize', onResize);
  };
}
