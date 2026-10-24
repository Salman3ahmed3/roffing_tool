/** Fence calculator: validation, units and display. Maths in ../calc/fence. */
import { bagYieldCuFt, fenceMaterials } from '../calc/fence';
import { cmToIn, cuftToCum, ftToM, inchesToCm, kgToLb, mToFt, trimNum } from '../calc/units';
import { fmt, fmtTrim } from '../format';
import { allBlank, readNum } from './fields';
import type { ToolSpec, ToolState, ToolView } from './types';

export const FENCE_DEFAULTS: ToolState = {
  u: 'imp',
  len: '100',
  space: '8',
  rails: '3',
  pw: '5.5',
  gap: '0',
  corners: '0',
  post: '4x4',
  dia: '10',
  depth: '30',
  gravel: '6',
  bag: '80',
};

/** Actual (dressed) post widths in inches. */
export const POST_SIZES = { '4x4': 3.5, '6x6': 5.5 } as const;
export const BAGS_IMP = ['50', '60', '80'];
export const BAGS_MET = ['20', '25', '30'];

export function evaluateFence(s: ToolState): ToolView {
  const errors: Record<string, string> = {};
  const met = s.u === 'met';
  const L = met ? 'm' : 'ft';
  const S = met ? 'cm' : 'in';
  const empty = allBlank(s, ['len']);

  const len = readNum(s.len, 'len', { label: 'fence length', required: true, gt: 0, max: met ? 3000 : 10000, unit: L }, errors);
  const space = readNum(s.space, 'space', { label: 'post spacing', required: true, gt: 0, max: met ? 3.6 : 12, unit: L }, errors);
  const rails = readNum(s.rails, 'rails', { required: true, integer: true, min: 1, max: 6 }, errors);
  const pw = readNum(s.pw, 'pw', { label: 'picket width', required: true, gt: 0, max: met ? 30 : 12, unit: S }, errors);
  const gap = readNum(s.gap, 'gap', { required: true, min: 0, max: met ? 15 : 6, unit: S }, errors);
  const corners = readNum(s.corners, 'corners', { required: true, integer: true, min: 0, max: 50 }, errors);
  const dia = readNum(s.dia, 'dia', { label: 'hole diameter', required: true, gt: 0, max: met ? 60 : 24, unit: S }, errors);
  const depth = readNum(s.depth, 'depth', { label: 'hole depth', required: true, gt: 0, max: met ? 200 : 72, unit: S }, errors);
  const gravel = readNum(s.gravel, 'gravel', { required: true, min: 0, max: met ? 50 : 18, unit: S }, errors);
  const postW = POST_SIZES[(s.post in POST_SIZES ? s.post : '4x4') as keyof typeof POST_SIZES];
  const bags = met ? BAGS_MET : BAGS_IMP;
  const bag = bags.includes(s.bag) ? Number(s.bag) : Number(bags[bags.length - 1]);

  if (dia !== null && !errors.dia && (met ? cmToIn(dia) : dia) <= postW) errors.dia = 'Hole must be wider than the post';
  if (gravel !== null && depth !== null && !errors.gravel && gravel >= depth) errors.gravel = 'Gravel must be shallower than the hole';

  const base = { errors: empty ? {} : errors, empty, results: null, summary: '', list: [], listMeta: '' };
  if (empty) return { ...base, status: { text: 'Enter your fence length — results appear as you type.', tone: 'info' } };
  if (Object.keys(errors).length) return { ...base, status: { text: 'Fix the highlighted field to see results.', tone: 'info' } };

  const toIn = (v: number) => (met ? cmToIn(v) : v);
  const toFt = (v: number) => (met ? mToFt(v) : v);
  const r = fenceMaterials({
    lengthFt: toFt(len!),
    postSpacingFt: toFt(space!),
    railsPerSection: rails!,
    picketWidthIn: toIn(pw!),
    picketGapIn: toIn(gap!),
    corners: corners!,
    holeDiameterIn: toIn(dia!),
    holeDepthIn: toIn(depth!),
    gravelIn: toIn(gravel!),
    postWidthIn: postW,
    bagLb: met ? kgToLb(bag) : bag,
  });

  const vol = (cuft: number) => (met ? `${fmt(cuftToCum(cuft), 2)} m³` : `${fmt(cuft, 1)} ft³`);
  const bagTxt = `${bag} ${met ? 'kg' : 'lb'}`;
  const postTxt = s.post === '6x6' ? '6×6' : '4×4';
  const gravelCuFt = (Math.PI * (toIn(dia!) / 2) ** 2 * toIn(gravel!) * r.posts) / 1728;

  const warn = toFt(space!) > 8;
  const status: ToolView['status'] = warn
    ? { text: 'Spacing over 8 ft needs rails longer than the common 8 ft stock. Check rail length before ordering.', tone: 'warn' }
    : { text: 'Straight runs assumed. Add one corner for each change of direction; gates are not included.', tone: 'info' };

  const results = {
    posts: { value: fmt(r.posts), sub: `${postTxt} · ${r.sections} sections${corners ? ` + ${corners} corner${corners > 1 ? 's' : ''}` : ''}` },
    rails: { value: fmt(r.rails), sub: `${rails} per section · ${fmtTrim(space!, 2)} ${L} long` },
    pickets: { value: fmt(r.pickets), sub: `${fmtTrim(pw!, 2)} ${S} wide · ${fmtTrim(gap!, 2)} ${S} gap` },
    bags: { value: fmt(r.bags), sub: `${bagTxt} · ${vol(r.concreteCuFt)}` },
  };
  const summary = `${fmtTrim(len!, 2)} ${L} ÷ ${fmtTrim(space!, 2)} ${L} = ${r.sections} sections → ${r.posts} posts · ${vol(r.concreteCuFtPerPost)} concrete per post ÷ ${fmt(met ? cuftToCum(bagYieldCuFt(kgToLb(bag))) * 1000 : bagYieldCuFt(bag), 2)} ${met ? 'L' : 'ft³'} per bag = ${r.bags} bags`;
  const list = [
    { name: `Posts, ${postTxt}`, qty: fmt(r.posts), unit: 'posts' },
    { name: `Rails, ${fmtTrim(space!, 2)} ${L}`, qty: fmt(r.rails), unit: 'rails' },
    { name: 'Pickets', qty: fmt(r.pickets), unit: 'pickets' },
    { name: `Concrete mix, ${bagTxt} bags`, qty: fmt(r.bags), unit: 'bags' },
  ];
  if (gravel! > 0) list.push({ name: 'Gravel for post holes', qty: met ? fmt(cuftToCum(gravelCuFt), 2) : fmt(gravelCuFt, 1), unit: met ? 'm³' : 'ft³' });

  return {
    errors: {},
    empty: false,
    status,
    results,
    summary,
    list,
    listMeta: `${fmtTrim(len!, 2)} ${L} fence · posts every ${fmtTrim(space!, 2)} ${L} · ${rails} rails`,
  };
}

const c = (v: string, f: (x: number) => number, dp: number) => {
  const n = Number(v);
  return v.trim() === '' || !Number.isFinite(n) ? v : trimNum(f(n), dp);
};

export function convertFenceUnits(s: ToolState, to: 'imp' | 'met'): ToolState {
  if (s.u === to) return s;
  const m = to === 'met';
  const lf = m ? ftToM : mToFt;
  const sf = m ? inchesToCm : cmToIn;
  const bagMap: Record<string, string> = m ? { '50': '20', '60': '25', '80': '30' } : { '20': '50', '25': '60', '30': '80' };
  return {
    ...s,
    u: to,
    len: c(s.len, lf, 2),
    space: c(s.space, lf, 2),
    pw: c(s.pw, sf, 2),
    gap: c(s.gap, sf, 2),
    dia: c(s.dia, sf, 2),
    depth: c(s.depth, sf, 2),
    gravel: c(s.gravel, sf, 2),
    bag: bagMap[s.bag] ?? (m ? '30' : '80'),
  };
}

export function describeFenceInputs(s: ToolState): [string, string][] {
  const met = s.u === 'met';
  const L = met ? 'm' : 'ft';
  const S = met ? 'cm' : 'in';
  return [
    ['Units', met ? 'Metric' : 'Feet / inches'],
    ['Fence length', `${s.len} ${L}`],
    ['Post spacing (on center)', `${s.space} ${L}`],
    ['Corners', s.corners],
    ['Rails per section', s.rails],
    ['Picket width', `${s.pw} ${S}`],
    ['Gap between pickets', `${s.gap} ${S}`],
    ['Post size', s.post === '6x6' ? '6×6' : '4×4'],
    ['Hole diameter', `${s.dia} ${S}`],
    ['Hole depth', `${s.depth} ${S}`],
    ['Gravel base', `${s.gravel} ${S}`],
    ['Concrete bag', `${s.bag} ${met ? 'kg' : 'lb'}`],
  ];
}

const fenceUnits = (s: ToolState) => (s.u === 'met' ? 'm' : 'ft');

export const fenceSpec: ToolSpec = {
  id: 'fence',
  title: 'Fence materials',
  toolName: 'Fence Calculator',
  slug: 'fence',
  formula: [
    'sections = ⌈length ÷ post spacing⌉',
    'posts = sections + 1 + corners',
    'rails = sections × rails per section',
    'pickets = ⌈length ÷ (picket width + gap)⌉',
    'concrete per post = (π × (Ø ÷ 2)² − post²) × (depth − gravel)',
    'bags = ⌈posts × concrete per post ÷ bag yield⌉ (0.0075 ft³ per lb)',
  ],
  resultLabels: { posts: 'Posts', rails: 'Rails', pickets: 'Pickets', bags: 'Concrete bags' },
  describeInputs: describeFenceInputs,
  fileKey: (v) => (v.results ? `${v.results.posts.value}-posts` : 'results'),
  listText: {
    inputsHeading: 'YOUR FENCE',
    notIncluded: 'gates, post caps, brackets and fasteners',
    inputs: (s) => {
      const rows: [string, string][] = [
        ['Length', `${s.len} ${fenceUnits(s)}`],
        ['Post spacing', `${s.space} ${fenceUnits(s)}`],
        ['Rails', `${s.rails} per section`],
      ];
      if (s.corners && s.corners !== '0') rows.push(['Corners', s.corners]);
      return rows;
    },
    subject: (s) => `Fence materials list · ${s.len} ${fenceUnits(s)}`,
  },
  defaults: FENCE_DEFAULTS,
  evaluate: evaluateFence,
  convertUnits: convertFenceUnits,
};
