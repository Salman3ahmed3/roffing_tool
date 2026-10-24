// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { initDownloadMenu, setActionStatus } from '../src/scripts/download-menu';

const markup = `
  <div id="root">
    <div data-download>
      <button type="button" data-act="download" aria-haspopup="menu" aria-expanded="false" aria-controls="m">Download</button>
      <div id="m" role="menu" hidden>
        <button type="button" role="menuitem" tabindex="-1" data-dl="pdf">Download PDF</button>
        <button type="button" role="menuitem" tabindex="-1" data-dl="print">Print</button>
      </div>
    </div>
    <p data-act-status role="status" aria-live="polite"><span data-act-ok></span><span data-act-msg></span><span data-share-url></span></p>
  </div>
  <button id="outside">elsewhere</button>`;

const key = (el: Element, k: string) => el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));

describe('download menu', () => {
  let trigger: HTMLButtonElement;
  let menu: HTMLElement;
  let items: HTMLButtonElement[];
  let onPdf: Mock<() => void>;
  let onPrint: Mock<() => void>;

  beforeEach(() => {
    document.body.innerHTML = markup;
    onPdf = vi.fn<() => void>();
    onPrint = vi.fn<() => void>();
    initDownloadMenu(document.getElementById('root')!, { onPdf, onPrint });
    trigger = document.querySelector('[data-act="download"]')!;
    menu = document.querySelector('[role="menu"]')!;
    items = Array.from(document.querySelectorAll('[role="menuitem"]'));
  });

  it('starts closed and opens on click with focus on the first item', () => {
    expect(menu.hidden).toBe(true);
    expect(trigger.getAttribute('aria-haspopup')).toBe('menu');
    trigger.click();
    expect(menu.hidden).toBe(false);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(document.activeElement).toBe(items[0]);
  });
  it('arrow keys move between items and wrap', () => {
    trigger.click();
    key(items[0], 'ArrowDown');
    expect(document.activeElement).toBe(items[1]);
    key(items[1], 'ArrowDown');
    expect(document.activeElement).toBe(items[0]);
    key(items[0], 'ArrowUp');
    expect(document.activeElement).toBe(items[1]);
    key(items[1], 'Home');
    expect(document.activeElement).toBe(items[0]);
    key(items[0], 'End');
    expect(document.activeElement).toBe(items[1]);
  });
  it('ArrowDown / ArrowUp on the trigger open the menu at the first / last item', () => {
    key(trigger, 'ArrowUp');
    expect(document.activeElement).toBe(items[1]);
    key(items[1], 'Escape');
    key(trigger, 'ArrowDown');
    expect(document.activeElement).toBe(items[0]);
  });
  it('Escape closes and returns focus to the trigger', () => {
    trigger.click();
    key(items[0], 'Escape');
    expect(menu.hidden).toBe(true);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(trigger);
  });
  it('clicking outside closes it', () => {
    trigger.click();
    document.getElementById('outside')!.click();
    expect(menu.hidden).toBe(true);
  });
  it('Tab closes it', () => {
    trigger.click();
    key(items[0], 'Tab');
    expect(menu.hidden).toBe(true);
  });
  it('a second click on the trigger closes it', () => {
    trigger.click();
    trigger.click();
    expect(menu.hidden).toBe(true);
    expect(document.activeElement).toBe(trigger);
  });
  it('"Download PDF" and "Print" run their handlers, close the menu and return focus', () => {
    trigger.click();
    items[0].click();
    expect(onPdf).toHaveBeenCalledTimes(1);
    expect(menu.hidden).toBe(true);
    expect(document.activeElement).toBe(trigger);
    trigger.click();
    items[1].click();
    expect(onPrint).toHaveBeenCalledTimes(1);
    expect(onPdf).toHaveBeenCalledTimes(1);
  });
  it('a disabled trigger does not open', () => {
    trigger.disabled = true;
    key(trigger, 'ArrowDown');
    expect(menu.hidden).toBe(true);
  });
  it('status shows a short confirmation and hides itself after 4 seconds', () => {
    vi.useFakeTimers();
    try {
      const root = document.getElementById('root')!;
      const status = document.querySelector('[data-act-status]')!;
      expect(status.getAttribute('aria-live')).toBe('polite');
      expect(status.hasAttribute('data-on')).toBe(false);
      setActionStatus(root, 'PDF downloaded', { ok: true });
      expect(status.hasAttribute('data-on')).toBe(true);
      expect(status.textContent).toBe('✓PDF downloaded');
      vi.advanceTimersByTime(3900);
      expect(status.textContent).toBe('✓PDF downloaded');
      vi.advanceTimersByTime(200);
      expect(status.hasAttribute('data-on')).toBe(false);
      expect(status.textContent).toBe('');
    } finally {
      vi.useRealTimers();
    }
  });
  it('a newer message resets the hide timer', () => {
    vi.useFakeTimers();
    try {
      const root = document.getElementById('root')!;
      const status = document.querySelector('[data-act-status]')!;
      setActionStatus(root, 'Link copied', { ok: true });
      vi.advanceTimersByTime(3000);
      setActionStatus(root, 'PDF downloaded', { ok: true });
      vi.advanceTimersByTime(3000);
      expect(status.textContent).toBe('✓PDF downloaded');
      vi.advanceTimersByTime(1100);
      expect(status.textContent).toBe('');
    } finally {
      vi.useRealTimers();
    }
  });
  it('the clipboard fallback keeps the full link on screen', () => {
    vi.useFakeTimers();
    try {
      const root = document.getElementById('root')!;
      const status = document.querySelector('[data-act-status]')!;
      const url = 'https://exteriormath.com/deck-calculator/?len=16';
      setActionStatus(root, 'Copy this link:', { url });
      vi.advanceTimersByTime(10000);
      expect(status.textContent).toBe('Copy this link:' + url);
      setActionStatus(root, '');
      expect(status.hasAttribute('data-on')).toBe(false);
      expect(status.textContent).toBe('');
    } finally {
      vi.useRealTimers();
    }
  });
});
