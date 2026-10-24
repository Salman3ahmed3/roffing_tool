/**
 * Client behaviour for <RoofPitchTool>. All maths lives in /src/lib/calc/pitch.ts.
 */
import {
  angleFromRatio,
  classifyPitch,
  evaluatePitch,
  formatPitchResults,
  pitchResults,
  type LengthUnit,
  type PitchInputs,
  type PitchMode,
} from '../lib/calc/pitch';
import { cmToInches, inchesToCm, inchesToFtIn, parseNum, trimNum } from '../lib/calc/units';
import { triangleGeometry } from '../lib/pitch-diagram';
import { buildPitchQuery, parsePitchParams } from '../lib/url-state/pitch';
import { pitchReport } from '../lib/report';
import { SITE } from '../config/site';
import { copyText, flashLabel, shareLink } from './clipboard';
import { initDownloadMenu, setActionStatus } from './download-menu';

const MODES: PitchMode[] = ['rr', 'angle', 'pitch'];
const FIELDS = ['riseFt', 'riseIn', 'runFt', 'runIn', 'riseCm', 'runCm', 'angle', 'pitch'] as const;
type FieldKey = (typeof FIELDS)[number];

export interface InitOptions {
  /** Write state into the page URL (full tool page) or not (homepage embed). */
  syncUrl?: boolean;
  /** Path of the full tool, used for share links from embeds. */
  toolPath?: string;
}

export function initRoofPitchTool(root: HTMLElement, opts: InitOptions = {}) {
  const syncUrl = opts.syncUrl ?? root.dataset.syncUrl !== 'false';
  const toolPath = opts.toolPath ?? root.dataset.toolPath ?? location.pathname;

  const $ = <T extends Element = HTMLElement>(sel: string) => root.querySelector<T>(sel);
  const $$ = <T extends Element = HTMLElement>(sel: string) => Array.from(root.querySelectorAll<T>(sel));

  const inputs = new Map<FieldKey, HTMLInputElement>();
  for (const key of FIELDS) {
    const el = $<HTMLInputElement>(`input[name="${key}"]`);
    if (el) inputs.set(key, el);
  }
  const tabs = $$<HTMLButtonElement>('[role="tab"]');
  const unitBtns = $$<HTMLButtonElement>('[data-unit]');
  const out = {
    pitch: $('[data-out="pitch"]'),
    angle: $('[data-out="angle"]'),
    slope: $('[data-out="slope"]'),
    multiplier: $('[data-out="multiplier"]'),
  };
  const status = $('[data-status]');
  const diagram = $('.diagram');
  const svg = $<SVGSVGElement>('[data-diagram]');
  const dg = {
    title: svg?.querySelector('title'),
    tri: svg?.querySelector('[data-dg="tri"]'),
    arc: svg?.querySelector('[data-dg="arc"]'),
    run: svg?.querySelector<SVGTextElement>('[data-dg="run"]'),
    rise: svg?.querySelector<SVGTextElement>('[data-dg="rise"]'),
    ang: svg?.querySelector('[data-dg="ang"]'),
  };
  const printUrlEl = $('[data-print-url]');
  const live = $('[data-live]');
  const actBtns = $$<HTMLButtonElement>('[data-act]');

  // ── State ──────────────────────────────────────────
  let state: PitchInputs = parsePitchParams(new URLSearchParams(syncUrl ? location.search : ''));

  const readInput = (el: HTMLInputElement) => (el.validity.badInput ? 'invalid' : el.value);

  function writeInputs() {
    for (const [key, el] of inputs) {
      if (el.value !== state[key] && document.activeElement !== el) el.value = state[key];
    }
  }

  function shareUrl() {
    const q = buildPitchQuery(state);
    return `${location.origin}${toolPath}${q ? `?${q}` : ''}`;
  }

  let dlMenu: ReturnType<typeof initDownloadMenu> = null;
  let liveTimer = 0;
  let urlTimer = 0;

  function render(writeUrl = true) {
    const ev = evaluatePitch(state);
    const valid = ev.ratio !== null;
    const res = valid ? pitchResults(ev.ratio as number) : null;
    const f = res ? formatPitchResults(res) : null;

    // Tabs & panels
    for (const t of tabs) {
      const on = t.dataset.mode === state.mode;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      const panel = document.getElementById(t.getAttribute('aria-controls') ?? '');
      if (panel) panel.hidden = !on;
    }
    for (const b of unitBtns) b.setAttribute('aria-pressed', String(b.dataset.unit === state.unit));
    const imp = $('.unit-imp');
    const met = $('.unit-met');
    if (imp) imp.hidden = state.unit !== 'imp';
    if (met) met.hidden = state.unit !== 'met';

    // Errors
    for (const field of $$('[data-field]')) {
      const key = field.dataset.field as keyof typeof ev.errors;
      const msg = ev.errors[key];
      field.classList.toggle('has-error', Boolean(msg));
      field.querySelectorAll('input').forEach((i) => i.setAttribute('aria-invalid', String(Boolean(msg))));
      const errEl = field.querySelector('[data-error]');
      if (errEl) errEl.textContent = msg ? `⚠ ${msg}` : '';
    }

    // Results
    const set = (el: HTMLElement | null, v: string | undefined) => {
      if (!el) return;
      el.textContent = v ?? '—';
      el.classList.toggle('empty', !v);
    };
    set(out.pitch, f?.pitch);
    set(out.angle, f?.angle);
    set(out.slope, f?.slope);
    set(out.multiplier, f?.multiplier);

    if (status) {
      status.textContent = ev.empty
        ? 'Enter your measurements — results appear as you type.'
        : !valid
          ? 'Fix the highlighted field to see results.'
          : classifyPitch((res as NonNullable<typeof res>).pitch);
    }

    // Diagram
    const g = triangleGeometry(ev.ratio);
    diagram?.classList.toggle('is-empty', !valid);
    dg.tri?.setAttribute('points', g.points);
    dg.arc?.setAttribute('d', g.arc);
    if (dg.run) {
      dg.run.setAttribute('x', String(g.runX));
      dg.run.setAttribute('y', String(g.runY));
      dg.run.textContent = `Run ${valid ? ev.runLabel : '—'}`;
    }
    if (dg.rise) {
      dg.rise.setAttribute('x', String(g.riseX));
      dg.rise.setAttribute('y', String(g.riseY));
      dg.rise.setAttribute('text-anchor', g.riseAnchor);
      dg.rise.textContent = `Rise ${valid ? ev.riseLabel : '—'}`;
      fitRiseLabel(dg.rise, g);
    }
    if (dg.ang) dg.ang.textContent = f ? f.angle : '';
    if (dg.title)
      dg.title.textContent = valid
        ? `Roof slope diagram: rise ${ev.riseLabel} over run ${ev.runLabel}, ${f?.angle}`
        : 'Roof slope diagram: waiting for valid measurements';

    // Actions
    for (const b of actBtns) b.disabled = !valid;
    const url = shareUrl();
    if (printUrlEl) printUrlEl.textContent = url;
    // The share link is only shown after "Share link" is used; a change of input makes it stale.
    if (writeUrl) setActionStatus(root, '');
    if (!valid) dlMenu?.close();

    // Carry pitch into the materials calculator
    document.querySelectorAll<HTMLAnchorElement>('[data-pitch-next]').forEach((a) => {
      const base = a.dataset.base ?? a.getAttribute('href')?.split('?')[0] ?? '/roofing-calculator/';
      a.dataset.base = base;
      a.href = res ? `${base}?pitch=${trimNum(res.pitch, 2)}` : base;
    });

    // Screen-reader summary, debounced so it does not chatter on every keystroke
    window.clearTimeout(liveTimer);
    liveTimer = window.setTimeout(() => {
      if (!live) return;
      const errs = Object.values(ev.errors);
      live.textContent = f
        ? `Pitch ${f.pitch}, angle ${f.angle}, slope ${f.slope}, rafter multiplier ${f.multiplier}.`
        : errs.length
          ? errs.join('. ')
          : '';
    }, 700);

    if (syncUrl && writeUrl) {
      window.clearTimeout(urlTimer);
      urlTimer = window.setTimeout(() => {
        const q = buildPitchQuery(state);
        history.replaceState(history.state, '', `${location.pathname}${q ? `?${q}` : ''}${location.hash}`);
      }, 250);
    }
    return { ev, res, f };
  }

  /** Long rise labels near the right edge would leave the canvas; move them inside the triangle. */
  function fitRiseLabel(el: SVGTextElement, g: ReturnType<typeof triangleGeometry>) {
    try {
      if (g.riseAnchor !== 'start') return;
      const box = el.getBBox();
      if (box.x + box.width > 414) {
        const edge = Number(g.points.split(' ')[1].split(',')[0]);
        el.setAttribute('x', String(edge - 10));
        el.setAttribute('text-anchor', 'end');
      }
    } catch {
      /* getBBox throws when the SVG is not rendered (e.g. display:none) */
    }
  }

  // ── Mode / unit switching keeps the current slope ──
  function currentRatio(): number | null {
    return evaluatePitch(state).ratio;
  }

  function setMode(mode: PitchMode) {
    if (mode === state.mode) return;
    const r = currentRatio();
    const next: PitchInputs = { ...state, mode };
    if (r !== null) {
      if (mode === 'angle') next.angle = angleFromRatio(r).toFixed(2);
      if (mode === 'pitch') next.pitch = trimNum(r * 12, 2);
      if (mode === 'rr') {
        const rrRatio = evaluatePitch(next).ratio;
        if (rrRatio === null || Math.abs(rrRatio - r) > 1e-9) {
          // Keep the visitor's run (or 12″ / 30 cm if it is unusable) and re-derive the rise.
          if (next.unit === 'met') {
            const run = parseNum(next.runCm);
            const runCm = run && run > 0 ? run : 30;
            next.runCm = trimNum(runCm, 2);
            next.riseCm = trimNum(runCm * r, 3);
          } else {
            const ft = parseNum(next.runFt) ?? 0;
            const inch = parseNum(next.runIn) ?? 0;
            const ok = Number.isFinite(ft) && Number.isFinite(inch) && ft >= 0 && inch >= 0 && inch < 12;
            const runIn = ok && ft * 12 + inch > 0 ? ft * 12 + inch : 12;
            Object.assign(next, splitIn(runIn, 'run'), splitIn(runIn * r, 'rise'));
          }
        }
      }
    }
    state = next;
    writeInputs();
    render();
  }

  function splitIn(totalIn: number, k: 'rise' | 'run') {
    // 3 decimals so a converted value reproduces the same angle to 0.01°.
    const { ft, inches } = inchesToFtIn(totalIn, 3);
    return { [`${k}Ft`]: String(ft), [`${k}In`]: trimNum(inches, 3) } as Partial<PitchInputs>;
  }

  function setUnit(unit: LengthUnit) {
    if (unit === state.unit) return;
    const next: PitchInputs = { ...state, unit };
    const ev = evaluatePitch(state);
    if (ev.ratio !== null) {
      if (unit === 'met') {
        const tot = (ft: string, i: string) => (parseNum(ft) ?? 0) * 12 + (parseNum(i) ?? 0);
        next.riseCm = trimNum(inchesToCm(tot(state.riseFt, state.riseIn)), 3);
        next.runCm = trimNum(inchesToCm(tot(state.runFt, state.runIn)), 3);
      } else {
        Object.assign(next, splitIn(cmToInches(Number(state.riseCm)), 'rise'), splitIn(cmToInches(Number(state.runCm)), 'run'));
      }
    }
    state = next;
    writeInputs();
    render();
  }

  // ── Events ─────────────────────────────────────────
  for (const [key, el] of inputs) {
    el.addEventListener('input', () => {
      state = { ...state, [key]: readInput(el) };
      render();
    });
  }

  tabs.forEach((t, i) => {
    t.addEventListener('click', () => setMode(t.dataset.mode as PitchMode));
    t.addEventListener('keydown', (e) => {
      let j = -1;
      if (e.key === 'ArrowRight') j = (i + 1) % tabs.length;
      else if (e.key === 'ArrowLeft') j = (i - 1 + tabs.length) % tabs.length;
      else if (e.key === 'Home') j = 0;
      else if (e.key === 'End') j = tabs.length - 1;
      if (j < 0) return;
      e.preventDefault();
      setMode(MODES[j]);
      tabs[j].focus();
    });
  });

  for (const b of unitBtns) b.addEventListener('click', () => setUnit(b.dataset.unit as LengthUnit));

  root.querySelector('[data-act="copy"]')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget as HTMLButtonElement;
    const { ev, f } = render(false);
    if (!f) return;
    const text = [
      `Roof pitch ${f.pitch} · ${f.angle} · ${f.slope} slope · rafter multiplier ${f.multiplier}`,
      ev.riseLabel && ev.runLabel ? `Rise ${ev.riseLabel} over run ${ev.runLabel}` : '',
      shareUrl(),
    ]
      .filter(Boolean)
      .join('\n');
    flashLabel(btn, (await copyText(text)) ? 'Copied ✓' : 'Copy failed');
  });

  root.querySelector('[data-act="share"]')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget as HTMLButtonElement;
    const { f } = render(false);
    const url = shareUrl();
    const r = await shareLink({
      title: 'Roof pitch calculation',
      text: f ? `Roof pitch ${f.pitch} (${f.angle})` : 'Roof pitch calculator',
      url,
    });
    if (r === 'copied') {
      flashLabel(btn, 'Link copied ✓');
      setActionStatus(root, 'Link copied:', url);
    } else if (r === 'shared') setActionStatus(root, 'Link shared:', url);
    else if (r === 'failed') setActionStatus(root, 'Copy this link:', url);
  });

  dlMenu = initDownloadMenu(root, {
    onPdf: async () => {
      render(false);
      const report = pitchReport(state, { brand: SITE.brand, date: new Date(), siteUrl: (import.meta.env.SITE ?? location.origin).replace(/\/$/, ''), shareUrl: shareUrl() });
      if (!report) return;
      setActionStatus(root, 'Preparing PDF…');
      try {
        const { downloadReportPdf } = await import('./pdf-download');
        const name = await downloadReportPdf(report);
        setActionStatus(root, `Downloaded ${name}`);
      } catch {
        setActionStatus(root, 'The PDF could not be created. Use Print and choose “Save as PDF”.');
      }
    },
    onPrint: () => {
      render(false);
      window.print();
    },
  });

  writeInputs();
  // Do not rewrite the address bar until the visitor changes something.
  render(false);
}
