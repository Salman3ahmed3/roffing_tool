/**
 * Client engine for the materials-style calculators. A ToolSpec (pure, tested) supplies the maths,
 * validation and wording; this file only moves values between the DOM, the URL and the spec.
 */
import type { ToolSpec, ToolState, ToolView, UnitSystem } from '../lib/tools/types';
import { buildToolQuery, parseToolParams } from '../lib/url-state/tool';
import { copyText, flashLabel, shareLink } from './clipboard';

type Control = HTMLInputElement | HTMLSelectElement;

export function initCalcTool(root: HTMLElement, spec: ToolSpec) {
  const $ = <T extends Element = HTMLElement>(sel: string) => root.querySelector<T>(sel);
  const $$ = <T extends Element = HTMLElement>(sel: string) => Array.from(root.querySelectorAll<T>(sel));

  const params = new URLSearchParams(location.search);
  let state: ToolState = parseToolParams(params, spec.defaults);
  // Pitch handed over from the Roof Pitch tool.
  if (params.has('pitch')) $$('[data-field="pitch"] [data-from-tag]').forEach((t) => (t.hidden = false));

  const controls = (): Control[] => $$<Control>('input[name], select[name]').filter((c) => c.type !== 'checkbox');

  function syncRadioUnits() {
    const met = state.u === 'met';
    for (const r of $$<HTMLInputElement>('input[type="radio"][data-imp]')) {
      r.value = (met ? r.dataset.met : r.dataset.imp) ?? r.value;
      const lab = r.nextElementSibling as HTMLElement | null;
      if (lab?.dataset.impLabel) lab.textContent = (met ? lab.dataset.metLabel : lab.dataset.impLabel) ?? '';
    }
  }

  function writeControls() {
    syncRadioUnits();
    for (const c of controls()) {
      const v = state[c.name];
      if (v === undefined) continue;
      if (c instanceof HTMLInputElement && c.type === 'radio') c.checked = c.value === v;
      else if (c.value !== v && document.activeElement !== c) c.value = v;
    }
  }

  const readControl = (c: Control) =>
    c instanceof HTMLInputElement && c.type === 'number' && c.validity.badInput ? 'invalid' : c.value;

  let liveTimer = 0;
  let urlTimer = 0;
  let view: ToolView = spec.evaluate(state);

  function shareUrl() {
    const q = buildToolQuery(state);
    return `${location.origin}${location.pathname}${q ? `?${q}` : ''}`;
  }

  function render(writeUrl = true) {
    view = spec.evaluate(state);
    root.dataset.unit = state.u;

    // Conditional fields
    for (const el of $$('[data-show-when]')) {
      const [k, v] = (el.dataset.showWhen ?? '').split('=');
      if (k) el.hidden = state[k] !== v;
    }
    // Errors
    for (const f of $$('[data-field]')) {
      const msg = view.errors[f.dataset.field ?? ''];
      f.classList.toggle('has-error', Boolean(msg));
      f.querySelectorAll('input, select').forEach((i) => i.setAttribute('aria-invalid', String(Boolean(msg))));
      const e = f.querySelector('[data-error]');
      if (e) e.textContent = msg ? `⚠ ${msg}` : '';
    }
    // Results
    for (const dd of $$('[data-out]')) {
      const cell = view.results?.[dd.dataset.out ?? ''];
      dd.textContent = cell?.value ?? '—';
      dd.classList.toggle('empty', !cell || cell.value === '—');
    }
    for (const sub of $$('[data-sub]')) sub.textContent = view.results?.[sub.dataset.sub ?? '']?.sub ?? '';
    const status = $('[data-status]');
    if (status) {
      status.textContent = view.status.text;
      status.dataset.tone = view.status.tone;
    }
    const summary = $('[data-summary]');
    if (summary) summary.textContent = view.summary;

    // Materials list (keep ticks for items that are still there)
    const list = $('[data-list]');
    if (list) {
      const ticked = new Set($$<HTMLInputElement>('[data-list] input:checked').map((i) => i.dataset.key));
      list.replaceChildren(
        ...view.list.map((it) => {
          const li = document.createElement('li');
          const label = document.createElement('label');
          const cb = document.createElement('input');
          cb.type = 'checkbox';
          cb.dataset.key = it.name;
          cb.checked = ticked.has(it.name);
          const name = document.createElement('span');
          name.className = 'name';
          name.textContent = it.name;
          const qty = document.createElement('b');
          qty.className = 'qty';
          qty.textContent = it.qty;
          const unit = document.createElement('span');
          unit.className = 'unit';
          unit.textContent = it.unit;
          label.append(cb, name, qty, unit);
          li.append(label);
          return li;
        }),
      );
    }
    const meta = $('[data-list-meta]');
    if (meta) {
      const date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      meta.textContent = view.listMeta ? `${view.listMeta} · ${date}` : '';
    }

    // Actions
    const ok = view.results !== null;
    for (const b of $$<HTMLButtonElement>('button[data-act]')) b.disabled = !ok;
    const email = $<HTMLAnchorElement>('[data-act-email]');
    if (email) {
      email.href = ok ? `mailto:?subject=${encodeURIComponent(`${spec.title} list`)}&body=${encodeURIComponent(plainText())}` : '#';
      email.toggleAttribute('aria-disabled', !ok);
      if (!ok) email.setAttribute('aria-disabled', 'true');
      email.tabIndex = ok ? 0 : -1;
    }
    const url = shareUrl();
    const su = $('[data-share-url]');
    if (su) su.textContent = url.replace(/^https?:\/\//, '');
    const pu = $('[data-print-url]');
    if (pu) pu.textContent = url;

    window.clearTimeout(liveTimer);
    liveTimer = window.setTimeout(() => {
      const live = $('[data-live]');
      if (!live) return;
      live.textContent = view.results
        ? resultLines().join('. ')
        : Object.values(view.errors).join('. ');
    }, 700);

    if (writeUrl) {
      window.clearTimeout(urlTimer);
      urlTimer = window.setTimeout(() => {
        const q = buildToolQuery(state);
        history.replaceState(history.state, '', `${location.pathname}${q ? `?${q}` : ''}${location.hash}`);
      }, 250);
    }
  }

  function resultLines(): string[] {
    if (!view.results) return [];
    return $$('[data-results] .result').map((cell) => {
      const label = (cell.querySelector('dt .long') ?? cell.querySelector('dt'))?.textContent?.trim() ?? '';
      const key = cell.querySelector<HTMLElement>('[data-out]')?.dataset.out ?? '';
      const r = view.results?.[key];
      return r ? `${label}: ${r.value}${r.sub ? ` (${r.sub})` : ''}` : '';
    });
  }

  function plainText(): string {
    return [
      `${spec.title} — ${view.listMeta}`,
      '',
      ...view.list.map((i) => `[ ] ${i.name}: ${i.qty} ${i.unit}`),
      '',
      view.summary,
      shareUrl(),
    ].join('\n');
  }

  // ── Events ─────────────────────────────────────────
  root.addEventListener('input', (e) => {
    const c = e.target as Control;
    if (!c.name || (c instanceof HTMLInputElement && c.type === 'checkbox')) return;
    if (c.name === 'u') {
      state = spec.convertUnits(state, c.value as UnitSystem);
      writeControls();
    } else {
      state = { ...state, [c.name]: readControl(c) };
    }
    render();
  });
  // Radios and selects fire "change" in some browsers without "input".
  root.addEventListener('change', (e) => {
    const c = e.target as Control;
    if (!c.name || c.name === 'u' || (c instanceof HTMLInputElement && c.type === 'checkbox')) return;
    if (state[c.name] !== readControl(c)) {
      state = { ...state, [c.name]: readControl(c) };
      render();
    }
  });

  $('[data-act="copy"]')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget as HTMLButtonElement;
    const text = [`${spec.title} — ${view.listMeta}`, ...resultLines(), '', ...view.list.map((i) => `${i.name}: ${i.qty} ${i.unit}`), '', shareUrl()].join('\n');
    flashLabel(btn, (await copyText(text)) ? 'Copied ✓' : 'Copy failed');
  });
  $('[data-act="share"]')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget as HTMLButtonElement;
    const r = await shareLink({ title: `${spec.title} calculation`, text: view.listMeta, url: shareUrl() });
    if (r === 'copied') flashLabel(btn, 'Link copied ✓');
    else if (r === 'failed') flashLabel(btn, 'Copy failed');
  });
  for (const b of $$('[data-act="print"]')) b.addEventListener('click', () => window.print());
  $('[data-act-email]')?.addEventListener('click', (e) => {
    if (!view.results) e.preventDefault();
  });

  writeControls();
  render(false);
}
