/**
 * "Print list": print only the list view. Adds `printing-list` to <html> just before
 * window.print() and removes it on `afterprint`. CSS in CalcTool.astro hides everything else.
 */
export const PRINT_LIST_CLASS = 'printing-list';

export function printListOnly(win: Window = window): void {
  const html = win.document.documentElement;
  const done = () => html.classList.remove(PRINT_LIST_CLASS);
  html.classList.add(PRINT_LIST_CLASS);
  win.addEventListener('afterprint', done, { once: true });
  win.print();
}
