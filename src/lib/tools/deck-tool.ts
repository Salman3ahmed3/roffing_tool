/** Deck calculator: validation, units and display. Maths in ../calc/deck. */
import { deckMaterials } from '../calc/deck';
import { ftToM, mmToIn, mToFt, MM_PER_IN, sqftToSqm, trimNum } from '../calc/units';
import { fmt, fmtTrim } from '../format';
import { allBlank, readNum } from './fields';
import type { ToolSpec, ToolState, ToolView } from './types';

export const DECK_DEFAULTS: ToolState = {
  u: 'imp',
  len: '16',
  dep: '12',
  bw: '5.5',
  gap: '0.125',
  blen: '16',
  js: '16',
  waste: '10',
};

export const JOIST_IMP = ['12', '16', '24'];
export const JOIST_MET = ['300', '400', '600'];
const WASTE = ['0', '5', '10', '15'];

export function evaluateDeck(s: ToolState): ToolView {
  const errors: Record<string, string> = {};
  const met = s.u === 'met';
  const L = met ? 'm' : 'ft';
  const S = met ? 'mm' : 'in';
  const empty = allBlank(s, ['len', 'dep']);

  const len = readNum(s.len, 'len', { label: 'deck length', required: true, gt: 0, max: met ? 60 : 200, unit: L }, errors);
  const dep = readNum(s.dep, 'dep', { label: 'deck depth', required: true, gt: 0, max: met ? 60 : 200, unit: L }, errors);
  const bw = readNum(s.bw, 'bw', { label: 'board width', required: true, gt: 0, max: met ? 300 : 12, unit: S }, errors);
  const gap = readNum(s.gap, 'gap', { required: true, min: 0, max: met ? 13 : 0.5, unit: S }, errors);
  const blen = readNum(s.blen, 'blen', { label: 'board length', required: true, gt: 0, max: met ? 7.5 : 24, unit: L }, errors);
  const jsOpts = met ? JOIST_MET : JOIST_IMP;
  const js = Number(jsOpts.includes(s.js) ? s.js : jsOpts[1]);
  const waste = Number(WASTE.includes(s.waste) ? s.waste : '10');

  const base = { errors: empty ? {} : errors, empty, results: null, summary: '', list: [], listMeta: '' };
  if (empty) return { ...base, status: { text: 'Enter your deck size — results appear as you type.', tone: 'info' } };
  if (Object.keys(errors).length) return { ...base, status: { text: 'Fix the highlighted field to see results.', tone: 'info' } };

  const toFt = (v: number) => (met ? mToFt(v) : v);
  const toIn = (v: number) => (met ? mmToIn(v) : v);
  const r = deckMaterials({
    lengthFt: toFt(len!),
    depthFt: toFt(dep!),
    boardWidthIn: toIn(bw!),
    gapIn: toIn(gap!),
    boardLengthFt: toFt(blen!),
    joistSpacingIn: met ? js / MM_PER_IN : js,
    wastePct: waste,
  });

  const area = met ? `${fmt(sqftToSqm(r.areaSqFt), 1)} m²` : `${fmt(r.areaSqFt)} sq ft`;
  const lin = met ? `${fmt(ftToM(r.deckingLinearFt), 1)} m` : `${fmt(r.deckingLinearFt)} lin ft`;
  const jsTxt = met ? `${js} mm` : `${js}″`;
  const wide = met ? js > 400 : js > 16;
  const status: ToolView['status'] = wide
    ? { text: 'Joists wider than 16″ apart are generally only allowed with 2× decking. 5/4 boards and most composites need 16″ or less (IRC Table R507.7, manufacturer instructions).', tone: 'warn' }
    : { text: 'Framing sizes, beams and posts depend on span tables and local code. This tool counts boards, joists and screws only.', tone: 'info' };
  const results = {
    boards: { value: fmt(r.boards), sub: `${fmtTrim(blen!, 2)} ${L} boards · ${r.rows} rows` },
    joists: { value: fmt(r.joists), sub: `${fmtTrim(dep!, 2)} ${L} long · ${jsTxt} o.c.` },
    rim: { value: fmt(r.rimJoists), sub: `${fmtTrim(len!, 2)} ${L} each` },
    screws: { value: fmt(r.screws), sub: '2 per board at each joist' },
  };
  const summary = `${area} deck · ${r.rows} rows × ${fmtTrim(len!, 2)} ${L} × ${(1 + waste / 100).toFixed(2)} waste = ${lin} ÷ ${fmtTrim(blen!, 2)} ${L} = ${r.boards} boards`;
  const list = [
    { name: `Deck boards, ${fmtTrim(blen!, 2)} ${L}`, qty: fmt(r.boards), unit: 'boards' },
    { name: `Joists, ${fmtTrim(dep!, 2)} ${L}`, qty: fmt(r.joists), unit: 'joists' },
    { name: `Rim joists, ${fmtTrim(len!, 2)} ${L}`, qty: fmt(r.rimJoists), unit: 'boards' },
    { name: 'Deck screws', qty: fmt(r.screws), unit: 'screws' },
  ];
  return {
    errors: {},
    empty: false,
    status,
    results,
    summary,
    list,
    listMeta: `${fmtTrim(len!, 2)} × ${fmtTrim(dep!, 2)} ${L} deck · joists ${jsTxt} o.c. · ${waste}% waste`,
  };
}

const c = (v: string, f: (x: number) => number, dp: number) => {
  const n = Number(v);
  return v.trim() === '' || !Number.isFinite(n) ? v : trimNum(f(n), dp);
};

export function convertDeckUnits(s: ToolState, to: 'imp' | 'met'): ToolState {
  if (s.u === to) return s;
  const m = to === 'met';
  const lf = m ? ftToM : mToFt;
  const sf = m ? (x: number) => x * MM_PER_IN : mmToIn;
  const jsMap: Record<string, string> = m ? { '12': '300', '16': '400', '24': '600' } : { '300': '12', '400': '16', '600': '24' };
  return {
    ...s,
    u: to,
    len: c(s.len, lf, 2),
    dep: c(s.dep, lf, 2),
    blen: c(s.blen, lf, 2),
    bw: c(s.bw, sf, m ? 1 : 2),
    gap: c(s.gap, sf, m ? 2 : 3),
    js: jsMap[s.js] ?? (m ? '400' : '16'),
  };
}

export function describeDeckInputs(s: ToolState): [string, string][] {
  const met = s.u === 'met';
  const L = met ? 'm' : 'ft';
  const S = met ? 'mm' : 'in';
  return [
    ['Units', met ? 'Metric' : 'Feet / inches'],
    ['Length (along house)', `${s.len} ${L}`],
    ['Depth (from house)', `${s.dep} ${L}`],
    ['Board width', `${s.bw} ${S}`],
    ['Gap', `${s.gap} ${S}`],
    ['Board length', `${s.blen} ${L}`],
    ['Joist spacing', met ? `${s.js} mm on center` : `${s.js}″ on center`],
    ['Waste', `${s.waste}%`],
  ];
}

export const deckSpec: ToolSpec = {
  id: 'deck',
  title: 'Deck materials',
  toolName: 'Deck Calculator',
  slug: 'deck',
  formula: [
    'rows = ⌈(depth + gap) ÷ (board width + gap)⌉',
    'boards = ⌈rows × length × (1 + waste %) ÷ board length⌉',
    'joists = ⌈length ÷ joist spacing⌉ + 1',
    'rim joists = 2 × length',
    'screws = rows × joists × 2',
  ],
  resultLabels: { boards: 'Deck boards', joists: 'Joists', rim: 'Rim joists', screws: 'Screws' },
  describeInputs: describeDeckInputs,
  fileKey: (v) => (v.results ? `${v.results.boards.value}-boards` : 'results'),
  defaults: DECK_DEFAULTS,
  evaluate: evaluateDeck,
  convertUnits: convertDeckUnits,
};
