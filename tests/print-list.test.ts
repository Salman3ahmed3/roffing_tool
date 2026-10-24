// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PRINT_LIST_CLASS, printListOnly } from '../src/scripts/print-list';

describe('printListOnly', () => {
  beforeEach(() => {
    // happy-dom has no print dialog; give the window a stub to spy on.
    Object.defineProperty(window, 'print', { value: () => {}, configurable: true, writable: true });
  });
  it('adds the class before printing and removes it after printing', () => {
    const html = document.documentElement;
    let duringPrint = false;
    const print = vi.spyOn(window, 'print').mockImplementation(() => {
      duringPrint = html.classList.contains(PRINT_LIST_CLASS);
    });
    printListOnly(window);
    expect(print).toHaveBeenCalledOnce();
    expect(duringPrint).toBe(true);
    expect(html.classList.contains(PRINT_LIST_CLASS)).toBe(true);
    window.dispatchEvent(new Event('afterprint'));
    expect(html.classList.contains(PRINT_LIST_CLASS)).toBe(false);
    print.mockRestore();
  });
  it('a later afterprint does not affect a full-page print', () => {
    const html = document.documentElement;
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    printListOnly(window);
    window.dispatchEvent(new Event('afterprint'));
    window.print(); // Download → Print: no class
    expect(html.classList.contains(PRINT_LIST_CLASS)).toBe(false);
    print.mockRestore();
  });
});
