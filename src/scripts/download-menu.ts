/**
 * "Download" menu button used by every calculator (markup in ToolActions.astro).
 * Menu-button pattern: aria-haspopup/aria-expanded on the trigger, arrow keys between items,
 * Escape and outside clicks close it, and focus returns to the trigger.
 */
export interface DownloadHandlers {
  onPdf: () => void | Promise<void>;
  onPrint: () => void;
}

export interface DownloadMenu {
  open: (focus?: 'first' | 'last') => void;
  close: (returnFocus?: boolean) => void;
  isOpen: () => boolean;
}

export function initDownloadMenu(root: ParentNode, handlers: DownloadHandlers): DownloadMenu | null {
  const wrap = root.querySelector<HTMLElement>('[data-download]');
  const trigger = wrap?.querySelector<HTMLButtonElement>('[data-act="download"]');
  const menu = wrap?.querySelector<HTMLElement>('[role="menu"]');
  if (!wrap || !trigger || !menu) return null;
  const items = Array.from(menu.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'));
  const doc = wrap.ownerDocument;

  const isOpen = () => trigger.getAttribute('aria-expanded') === 'true';
  const focusItem = (i: number) => items[(i + items.length) % items.length]?.focus();

  const open = (focus: 'first' | 'last' = 'first') => {
    if (trigger.disabled) return;
    menu.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    focusItem(focus === 'first' ? 0 : items.length - 1);
  };
  const close = (returnFocus = false) => {
    if (!isOpen()) return;
    menu.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    if (returnFocus) trigger.focus();
  };

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    if (isOpen()) close(true);
    else open('first');
  });
  trigger.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      open('first');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      open('last');
    }
  });
  menu.addEventListener('keydown', (e) => {
    const i = items.indexOf(doc.activeElement as HTMLButtonElement);
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        focusItem(i + 1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        focusItem(i - 1);
        break;
      case 'Home':
        e.preventDefault();
        focusItem(0);
        break;
      case 'End':
        e.preventDefault();
        focusItem(items.length - 1);
        break;
      case 'Escape':
        e.preventDefault();
        e.stopPropagation();
        close(true);
        break;
      case 'Tab':
        close(false);
        break;
    }
  });
  for (const item of items) {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      const action = item.dataset.dl;
      close(true);
      if (action === 'pdf') void handlers.onPdf();
      else if (action === 'print') handlers.onPrint();
    });
  }
  doc.addEventListener('click', (e) => {
    if (isOpen() && e.target instanceof Node && !wrap.contains(e.target)) close(false);
  });
  doc.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen()) close(true);
  });

  return { open, close, isOpen };
}

/** Status line under the action buttons ("Link copied: …", "Preparing PDF…"). */
export function setActionStatus(root: ParentNode, message: string, url = ''): void {
  const status = root.querySelector<HTMLElement>('[data-act-status]');
  if (!status) return;
  const msg = status.querySelector('[data-act-msg]');
  const link = status.querySelector('[data-share-url]');
  if (msg) msg.textContent = message;
  if (link) link.textContent = url.replace(/^https?:\/\//, '');
  status.toggleAttribute('data-on', Boolean(message || url));
}
