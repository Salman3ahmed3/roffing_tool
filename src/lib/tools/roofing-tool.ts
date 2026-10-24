/** Roofing materials calculator: input validation, unit handling and display. Maths in ../calc/roofing. */
import { formatFtIn } from '../calc/units';
import { MAX_PITCH, rafterMultiplier } from '../calc/pitch';
import {
  BUNDLES_PER_SQUARE,
  UNDERLAYMENT_OPTIONS,
  roofingMaterials,
  type MeasureBy,
  type RoofShape,
} from '../calc/roofing';
import { ftToM, mToFt, sqftToSqm, sqmToSqft, trimNum } from '../calc/units';
import { fmt, fmtTrim } from '../format';
import { allBlank, readNum } from './fields';
import type { ToolSpec, ToolState, ToolView } from './types';

export const ROOFING_DEFAULTS: ToolState = {
  u: 'imp',
  by: 'footprint',
  l: '40',
  w: '30',
  area: '',
  edge: '',
  pitch: '6',
  shape: 'gable',
  waste: '10',
  ul: 'synthetic10',
};

export const WASTE_OPTIONS = ['5', '10', '15', '20'];

/** Waste option tagged "Recommended" for each roof shape (a visual hint; it never changes the selection). */
export const RECOMMENDED_WASTE: Record<RoofShape, string> = { gable: '10', hip: '15' };

export function evaluateRoofing(s: ToolState): ToolView {
  const errors: Record<string, string> = {};
  const met = s.u === 'met';
  const lenU = met ? 'm' : 'ft';
  const areaU = met ? 'm²' : 'sq ft';
  const by = (s.by === 'area' ? 'area' : 'footprint') as MeasureBy;
  const shape = (s.shape === 'hip' ? 'hip' : 'gable') as RoofShape;
  const ul = UNDERLAYMENT_OPTIONS.find((o) => o.id === s.ul) ?? UNDERLAYMENT_OPTIONS[0];
  const waste = WASTE_OPTIONS.includes(s.waste) ? Number(s.waste) : 10;

  const requiredKeys = by === 'footprint' ? ['l', 'w', 'pitch'] : ['area', 'pitch'];
  const empty = allBlank(s, requiredKeys);

  const pitch = readNum(s.pitch, 'pitch', { label: 'pitch', required: true, min: 0, max: MAX_PITCH, unit: '/12' }, errors);
  let L: number | null = null;
  let W: number | null = null;
  let A: number | null = null;
  let E: number | null = null;
  if (by === 'footprint') {
    L = readNum(s.l, 'l', { label: 'length', required: true, gt: 0, max: met ? 300 : 1000, unit: lenU }, errors);
    W = readNum(s.w, 'w', { label: 'width', required: true, gt: 0, max: met ? 300 : 1000, unit: lenU }, errors);
  } else {
    A = readNum(s.area, 'area', { label: 'roof area', required: true, gt: 0, max: met ? 50000 : 500000, unit: areaU }, errors);
    E = readNum(s.edge, 'edge', { min: 0, max: met ? 3000 : 10000, unit: lenU }, errors);
  }

  const base = {
    errors: empty ? {} : errors,
    empty,
    results: null,
    summary: '',
    list: [],
    listMeta: '',
  };
  if (empty) return { ...base, status: { text: 'Enter your roof measurements — results appear as you type.', tone: 'info' } };
  if (Object.keys(errors).length || pitch === null)
    return { ...base, status: { text: 'Fix the highlighted field to see results.', tone: 'info' } };

  const r = roofingMaterials({
    measureBy: by,
    lengthFt: L !== null ? (met ? mToFt(L) : L) : undefined,
    widthFt: W !== null ? (met ? mToFt(W) : W) : undefined,
    roofAreaSqFt: A !== null ? (met ? sqmToSqft(A) : A) : undefined,
    edgeLengthFt: E !== null ? (met ? mToFt(E) : E) : null,
    pitch,
    wastePct: waste,
    shape,
    underlaymentSqFtPerRoll: ul.sqft,
  });

  const area = (sqft: number) => (met ? `${fmt(sqftToSqm(sqft), 1)} m²` : `${fmt(sqft)} sq ft`);
  const len = (ft: number) => (met ? `${fmt(ftToM(ft), 1)} m` : `${fmt(ft)} ft`);
  const pitchTxt = `${fmtTrim(pitch, 2)}/12`;
  const mult = r.multiplier.toFixed(3);

  const summary =
    by === 'footprint'
      ? `${fmtTrim(L!, 2)} × ${fmtTrim(W!, 2)} ${lenU} footprint = ${area(r.footprintSqFt!)} × ${mult} (${pitchTxt}) = ${area(r.roofAreaSqFt)} × ${(1 + waste / 100).toFixed(2)} waste = ${area(r.orderAreaSqFt)}`
      : `${area(r.roofAreaSqFt)} roof area × ${(1 + waste / 100).toFixed(2)} waste = ${area(r.orderAreaSqFt)} = ${fmt(r.squares, 2)} squares`;

  let status: ToolView['status'];
  if (r.slopeClass === 'not-allowed')
    status = {
      text: 'Below 2/12, asphalt shingles are not permitted (IRC R905.2.2). Quantities shown for reference only — use a low-slope roofing system.',
      tone: 'warn',
    };
  else if (r.slopeClass === 'double-underlayment')
    status = { text: 'From 2/12 to under 4/12, two layers of underlayment are required (IRC R905.1.1). The roll count includes both.', tone: 'warn' };
  else status = { text: 'Quantities rounded up to whole packages. Check bundle coverage on your product’s wrapper.', tone: 'info' };

  const ulShort = ul.label.split(',')[0];
  const results = {
    squares: { value: fmt(r.squares, 1), sub: `${area(r.orderAreaSqFt)} incl. waste` },
    bundles: { value: fmt(r.bundles), sub: `${BUNDLES_PER_SQUARE} per square` },
    underlayment: {
      value: fmt(r.underlaymentRolls),
      sub: `rolls · ${ul.sqft / 100} sq each${r.underlaymentLayers === 2 ? ' · 2 layers' : ''}`,
    },
    drip: r.dripEdgePieces === null
      ? { value: '—', sub: 'Enter eaves + rakes length' }
      : { value: fmt(r.dripEdgePieces), sub: `10 ft pieces · ${len(r.dripEdgeFt!)}` },
  };

  const list = [
    { name: 'Asphalt shingle bundles', qty: fmt(r.bundles), unit: 'bundles' },
    { name: `${ulShort} underlayment${r.underlaymentLayers === 2 ? ' (2 layers)' : ''}`, qty: fmt(r.underlaymentRolls), unit: 'rolls' },
  ];
  if (r.dripEdgePieces !== null) list.push({ name: 'Drip edge, 10 ft', qty: fmt(r.dripEdgePieces), unit: 'pieces' });

  const dims = by === 'footprint' ? `${fmtTrim(L!, 2)} × ${fmtTrim(W!, 2)} ${lenU}` : area(r.roofAreaSqFt);
  const listMeta = `${shape === 'hip' ? 'Hip' : 'Gable'} roof · ${dims} · ${pitchTxt} · ${waste}% waste`;

  return { errors: {}, empty: false, status, results, summary, list, listMeta };
}

const conv = (v: string, f: (x: number) => number, dp: number) => {
  const n = Number(v);
  return v.trim() === '' || !Number.isFinite(n) ? v : trimNum(f(n), dp);
};

export function convertRoofingUnits(s: ToolState, to: 'imp' | 'met'): ToolState {
  if (s.u === to) return s;
  const toMet = to === 'met';
  const lf = toMet ? ftToM : mToFt;
  const af = toMet ? sqftToSqm : sqmToSqft;
  return {
    ...s,
    u: to,
    l: conv(s.l, lf, 2),
    w: conv(s.w, lf, 2),
    edge: conv(s.edge, lf, 2),
    area: conv(s.area, af, 1),
  };
}

export function describeRoofingInputs(s: ToolState): [string, string][] {
  const met = s.u === 'met';
  const L = met ? 'm' : 'ft';
  const A = met ? 'm²' : 'sq ft';
  const ul = UNDERLAYMENT_OPTIONS.find((o) => o.id === s.ul) ?? UNDERLAYMENT_OPTIONS[0];
  const rows: [string, string][] = [
    ['Units', met ? 'Metric' : 'Feet / inches'],
    ['Measure by', s.by === 'area' ? 'Roof area' : 'Footprint'],
  ];
  if (s.by === 'area') {
    rows.push(['Roof area', `${s.area} ${A}`], ['Eaves + rakes', s.edge ? `${s.edge} ${L}` : 'Not entered']);
  } else {
    rows.push(['Length (along the ridge)', `${s.l} ${L}`], ['Width (gable end)', `${s.w} ${L}`]);
  }
  rows.push(
    ['Pitch', `${s.pitch}/12`],
    ['Roof shape', s.shape === 'hip' ? 'Hip' : 'Gable'],
    ['Waste', `${s.waste}%`],
    ['Underlayment', ul.label],
  );
  return rows;
}

export const roofingSpec: ToolSpec = {
  id: 'roofing',
  title: 'Roofing materials',
  toolName: 'Roofing Materials Calculator',
  slug: 'roofing',
  formula: [
    'roof area = length × width × √(1 + (pitch ÷ 12)²)',
    'order area = roof area × (1 + waste %)',
    'squares = order area ÷ 100',
    'bundles = ⌈squares × 3⌉',
    'underlayment rolls = ⌈order area × layers ÷ roll coverage⌉',
    'drip edge pieces = ⌈(eaves + rakes) ÷ 9.83 ft⌉',
  ],
  resultLabels: { squares: 'Roof squares', bundles: 'Bundles', underlayment: 'Underlayment', drip: 'Drip edge' },
  describeInputs: describeRoofingInputs,
  fileKey: (v) => (v.results ? `${v.results.squares.value}-squares` : 'results'),
  listText: {
    inputsHeading: 'YOUR ROOF',
    notIncluded: 'starter strip, ridge cap, flashing and fasteners',
    inputs: (s) => {
      const met = s.u === 'met';
      const rows: [string, string][] =
        s.by === 'area'
          ? [['Roof area', `${s.area} ${met ? 'm²' : 'sq ft'}`]]
          : [['Footprint', `${s.l} × ${s.w} ${met ? 'm' : 'ft'}`]];
      if (s.by === 'area' && s.edge) rows.push(['Eaves + rakes', `${s.edge} ${met ? 'm' : 'ft'}`]);
      const ul = UNDERLAYMENT_OPTIONS.find((o) => o.id === s.ul) ?? UNDERLAYMENT_OPTIONS[0];
      rows.push(
        ['Pitch', `${s.pitch}/12`],
        ['Roof shape', s.shape === 'hip' ? 'Hip' : 'Gable'],
        ['Waste', `${s.waste}%`],
        ['Underlayment', ul.label],
      );
      return rows;
    },
    subject: (s) =>
      `Roofing materials list · ${s.by === 'area' ? `${s.area} ${s.u === 'met' ? 'm²' : 'sq ft'}` : `${s.l} × ${s.w} ${s.u === 'met' ? 'm' : 'ft'}`}`,
  },
  defaults: ROOFING_DEFAULTS,
  evaluate: evaluateRoofing,
  convertUnits: convertRoofingUnits,
};

/** Rafter length for a gable side, for content examples. */
export const rafterLengthLabel = (runFt: number, pitch: number) => formatFtIn(runFt * 12 * rafterMultiplier(pitch / 12));
