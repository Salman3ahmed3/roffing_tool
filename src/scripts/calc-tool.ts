/**
 * Client engine for the materials-style calculators. A ToolSpec (pure, tested) supplies the maths,
 * validation and wording; this file only moves values between the DOM, the URL and the spec.
 */
import type { ToolSpec, ToolState, ToolView, UnitSystem } from '../lib/tools/types';
import { buildToolQuery, parseToolParams } from '../lib/url-state/tool';
import { toolReport } from '../lib/report';
import { SITE } from '../config/site';
import { copyText, flashLabel, shareLink } from './clipboard';
import { initDownloadMenu, setActionStatus } from './download-menu';
import { whenMatches } from '../lib/tools/fields';
import { buildListText, buildMailto, toolListData } from '../lib/tools/list-text';
import { loadTicks, pruneTicks, saveTicks } from '../lib/tools/ticks';
import { printListOnly } from './print-list';

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

  let dlMenu: ReturnType<typeof initDownloadMenu> = null;
  let liveTimer = 0;
  let urlTimer = 0;
  let view: ToolView = spec.evaluate(state);
  /** Ticked list items (by name), restored from localStorage. */
  let ticked = loadTicks(spec.id);

  function shareUrl() {
    const q = buildToolQuery(state);
    return `${location.origin}${location.pathname}${q ? `?${q}` : ''}`;
  }

  function render(writeUrl = true) {
    view = spec.evaluate(state);
    root.dataset.unit = state.u;

    // Conditional fields and hints ("Recommended" tags)
    for (const el of $$('[data-show-when]')) el.hidden = !whenMatches(el.dataset.showWhen, state);
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
    if (status) status.textContent = view.status.text;
    const statusBox = $('[data-status-box]') ?? status;
    if (statusBox) statusBox.dataset.tone = view.status.tone;
    const summary = $('[data-summary]');
    if (summary) summary.textContent = view.summary;

    // Materials list. Ticks for items that no longer exist are dropped (only once the results are
    // valid, so clearing a field mid-edit doesn't wipe them); quantity changes keep them.
    if (view.results) {
      const kept = pruneTicks(ticked, view.list.map((i) => i.name));
      if (kept.size !== ticked.size) saveTicks(spec.id, kept);
      ticked = kept;
    }
    const list = $('[data-list]');
    if (list) {
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
    syncClearTicks();
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
      const data = listData();
      email.href = data ? buildMailto(data, spec.listText.subject(state)).href : '#';
      email.toggleAttribute('aria-disabled', !ok);
      if (!ok) email.setAttribute('aria-disabled', 'true');
      email.tabIndex = ok ? 0 : -1;
    }
    const url = shareUrl();
    // The share link is only shown after "Share link" is used; a change of input makes it stale.
    if (writeUrl) setActionStatus(root, '');
    if (!ok) dlMenu?.close();
    for (const pu of $$('[data-print-url]')) pu.textContent = url;

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
      const label = cell.querySelector('dt')?.textContent?.trim() ?? '';
      const key = cell.querySelector<HTMLElement>('[data-out]')?.dataset.out ?? '';
      const r = view.results?.[key];
      return r ? `${label}: ${r.value}${r.sub ? ` (${r.sub})` : ''}` : '';
    });
  }

  function listData() {
    return toolListData(spec, state, view, { brand: SITE.brand, date: new Date(), url: shareUrl() });
  }

  function syncClearTicks() {
    const btn = $<HTMLButtonElement>('[data-clear-ticks]');
    if (btn) btn.hidden = ticked.size === 0;
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
    const data = listData();
    if (!data) return;
    flashLabel(btn, (await copyText(buildListText(data, { results: true }))) ? 'Copied ✓' : 'Copy failed');
  });
  $('[data-act="share"]')?.addEventListener('click', async () => {
    const url = shareUrl();
    const r = await shareLink({ title: `${spec.title} calculation`, text: view.listMeta, url });
    if (r === 'copied') setActionStatus(root, 'Link copied', { ok: true });
    else if (r === 'shared') setActionStatus(root, 'Link shared', { ok: true });
    else if (r === 'failed') setActionStatus(root, 'Copy this link:', { url });
  });
  // Ticking items: remember them per tool.
  $('[data-list]')?.addEventListener('change', (e) => {
    const cb = e.target as HTMLInputElement;
    if (cb.type !== 'checkbox' || !cb.dataset.key) return;
    if (cb.checked) ticked.add(cb.dataset.key);
    else ticked.delete(cb.dataset.key);
    saveTicks(spec.id, ticked);
    syncClearTicks();
  });
  $('[data-clear-ticks]')?.addEventListener('click', () => {
    ticked = new Set();
    saveTicks(spec.id, ticked);
    for (const cb of $$<HTMLInputElement>('[data-list] input[type="checkbox"]')) cb.checked = false;
    syncClearTicks();
    // The button hides itself; keep keyboard focus in the list.
    $<HTMLInputElement>('[data-list] input[type="checkbox"]')?.focus();
  });

  // "Print list" prints the list view only; Download → Print still prints the whole page.
  $('[data-act="print-list"]')?.addEventListener('click', () => printListOnly());

  // "Email list": mailto, with a fallback when no mail app takes it. If the page still has focus
  // about a second later, nothing opened, so copy the text and say so.
  $('[data-act-email]')?.addEventListener('click', (e) => {
    const link = e.currentTarget as HTMLElement;
    const data = listData();
    if (!data) {
      e.preventDefault();
      return;
    }
    let left = false;
    const onBlur = () => (left = true);
    window.addEventListener('blur', onBlur, { once: true });
    document.addEventListener('visibilitychange', onBlur, { once: true });
    window.setTimeout(async () => {
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onBlur);
      if (left || !document.hasFocus()) return;
      const copied = await copyText(buildListText(data));
      if (copied) flashLabel(link, 'List copied ✓', 3000);
      setActionStatus(
        root,
        copied ? 'No email app found. List copied, paste it into your email.' : 'No email app found. Use Copy results and paste the list into your email.',
        { hideAfter: 10000 },
      );
    }, 1000);
  });

  dlMenu = initDownloadMenu(root, {
    onPdf: async () => {
      const report = toolReport(spec, state, view, {
        brand: SITE.brand,
        date: new Date(),
        siteUrl: (import.meta.env.SITE ?? location.origin).replace(/\/$/, ''),
        shareUrl: shareUrl(),
      });
      if (!report) return;
      setActionStatus(root, 'Preparing PDF…');
      try {
        const { downloadReportPdf } = await import('./pdf-download');
        await downloadReportPdf(report);
        setActionStatus(root, 'PDF downloaded', { ok: true });
      } catch {
        setActionStatus(root, 'The PDF could not be created. Use Print and choose “Save as PDF”.');
      }
    },
    onPrint: () => window.print(),
  });

  writeControls();
  render(false);
}
