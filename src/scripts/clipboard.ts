/** Clipboard / share / button-feedback helpers shared by every tool. */

export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to the legacy path */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}

/** Native share sheet on touch devices; copies the link everywhere else. Returns what happened. */
export async function shareLink(data: { title: string; text: string; url: string }): Promise<'shared' | 'copied' | 'failed' | 'cancelled'> {
  const touch = window.matchMedia('(pointer: coarse)').matches;
  if (touch && typeof navigator.share === 'function') {
    try {
      await navigator.share(data);
      return 'shared';
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled';
    }
  }
  return (await copyText(data.url)) ? 'copied' : 'failed';
}

const timers = new WeakMap<HTMLElement, number>();

/** Temporarily swap a button label, e.g. "Copied ✓". */
export function flashLabel(btn: HTMLElement, label: string, ms = 1600) {
  const original = btn.dataset.label ?? btn.textContent ?? '';
  btn.dataset.label = original;
  btn.textContent = label;
  window.clearTimeout(timers.get(btn));
  timers.set(
    btn,
    window.setTimeout(() => {
      btn.textContent = original;
    }, ms),
  );
}
