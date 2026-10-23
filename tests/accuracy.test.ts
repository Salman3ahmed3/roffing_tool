/**
 * End-to-end accuracy cases for every calculator, run through the same code the pages use
 * (validation → maths → display formatting). Expected values are written out by hand from the
 * formulas in the "derivation" column, not computed by the code under test.
 *
 * Set ACCURACY_REPORT=<path> to also write these cases as a Markdown table.
 */
import { afterAll, describe, expect, it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { DEFAULT_PITCH_INPUTS, evaluatePitch, formatPitchResults, pitchResults, type PitchInputs } from '../src/lib/calc/pitch';
import { ROOFING_DEFAULTS, evaluateRoofing } from '../src/lib/tools/roofing-tool';
import { FENCE_DEFAULTS, evaluateFence } from '../src/lib/tools/fence-tool';
import { DECK_DEFAULTS, evaluateDeck } from '../src/lib/tools/deck-tool';
import type { ToolState, ToolView } from '../src/lib/tools/types';

const rows: Record<string, string[]> = { pitch: [], roofing: [], fence: [], deck: [] };
const row = (tool: string, inputs: string, output: string, expected: string, how: string) =>
  rows[tool].push(`| ${inputs} | ${output} | ${expected} | ${how} |`);

/* ── Roof pitch ───────────────────────────────────────── */
const pitch = (o: Partial<PitchInputs>) => {
  const ev = evaluatePitch({ ...DEFAULT_PITCH_INPUTS, ...o });
  if (ev.ratio === null) return `— (${Object.values(ev.errors).join('; ') || 'empty'})`;
  const f = formatPitchResults(pitchResults(ev.ratio));
  return `${f.pitch} · ${f.angle} · ${f.slope} · ×${f.multiplier}`;
};
const P: [string, Partial<PitchInputs>, string, string][] = [
  ['Rise 0′ 6″, run 1′ 0″', {}, '6/12 · 26.57° · 50.0% · ×1.118', 'r = 6/12 = 0.5; atan 0.5 = 26.565°; √1.25 = 1.1180'],
  ['Rise 4′ 6″, run 9′ 0″', { riseFt: '4', riseIn: '6', runFt: '9', runIn: '0' }, '6/12 · 26.57° · 50.0% · ×1.118', '54″ ÷ 108″ = 0.5 (same as 6/12)'],
  ['Angle 45°', { mode: 'angle', angle: '45' }, '12/12 · 45.00° · 100.0% · ×1.414', 'tan 45° = 1; 1 × 12 = 12; √2 = 1.4142'],
  ['Metric rise 30 cm, run 100 cm', { unit: 'met', riseCm: '30', runCm: '100' }, '3.6/12 · 16.70° · 30.0% · ×1.044', 'r = 0.3; 0.3 × 12 = 3.6; atan 0.3 = 16.699°; √1.09 = 1.0440'],
  ['Pitch 7.25/12', { mode: 'pitch', pitch: '7.25' }, '7.25/12 · 31.14° · 60.4% · ×1.168', 'r = 0.60417; atan = 31.141°; √(1 + r²) = 1.1683'],
  ['Zero rise (flat): 0″ over 12″', { riseFt: '0', riseIn: '0' }, '0/12 · 0.00° · 0.0% · ×1.000', 'r = 0; atan 0 = 0°; √1 = 1'],
  ['Maximum: pitch 48/12', { mode: 'pitch', pitch: '48' }, '48/12 · 75.96° · 400.0% · ×4.123', 'r = 4; atan 4 = 75.964°; √17 = 4.1231'],
  ['Too steep: rise 5′ over 1′', { riseFt: '5', riseIn: '0' }, '— (Steeper than 48/12 — check the measurement)', 'r = 5 > 4 (48/12 limit) → rejected'],
  ['Invalid: 14″ in the inches box, run 0', { riseFt: '0', riseIn: '14', runFt: '0', runIn: '0' }, '— (Inches must be less than 12 — add a foot instead; Run must be greater than 0)', 'inches field must be < 12; division by zero blocked'],
  ['Invalid: angle 80°', { mode: 'angle', angle: '80' }, '— (Enter an angle between 0° and 75°)', 'outside 0–75° range'],
  ['Invalid: text in pitch box', { mode: 'pitch', pitch: 'abc' }, '— (Use a positive number)', 'non-numeric rejected'],
];

describe('accuracy · roof pitch', () => {
  for (const [label, input, expected, how] of P) {
    it(label, () => {
      const out = pitch(input);
      row('pitch', label, out, expected, how);
      expect(out).toBe(expected);
    });
  }
});

/* ── Materials-style tools ────────────────────────────── */
const show = (v: ToolView, keys: string[], names: string[]) =>
  v.results
    ? keys.map((k, i) => `${names[i]} ${v.results![k].value}`).join(' · ')
    : `— (${Object.values(v.errors).join('; ') || 'empty'})`;

type Case = [string, Partial<ToolState>, string, string, RegExp?];
const run = (tool: string, defaults: ToolState, ev: (s: ToolState) => ToolView, keys: string[], names: string[], cases: Case[]) =>
  describe(`accuracy · ${tool}`, () => {
    for (const [label, input, expected, how, status] of cases) {
      it(label, () => {
        const v = ev({ ...defaults, ...input });
        const out = show(v, keys, names);
        row(tool, label, out + (status ? ` — “${v.status.text.split('.')[0]}.”` : ''), expected, how);
        expect(out).toBe(expected);
        if (status) expect(v.status.text).toMatch(status);
      });
    }
  });

run('roofing', ROOFING_DEFAULTS, evaluateRoofing, ['squares', 'bundles', 'underlayment', 'drip'], ['sq', 'bundles', 'rolls', 'drip pcs'], [
  ['40 × 30 ft, 6/12, gable, 10%, synthetic', {}, 'sq 14.8 · bundles 45 · rolls 2 · drip pcs 15',
    '1,200 × 1.11803 = 1,341.6 × 1.10 = 1,475.8 sq ft → 14.76 sq; ⌈14.76 × 3⌉ = ⌈44.3⌉ = 45; ⌈1,475.8 ÷ 1,000⌉ = 2; edge 2×40 + 4×15×1.118 = 147.1 ft ÷ 9.833 = 14.96 → 15'],
  ['Same roof, hip, 15% waste', { shape: 'hip', waste: '15' }, 'sq 15.4 · bundles 47 · rolls 2 · drip pcs 15',
    '1,341.6 × 1.15 = 1,542.9 → 15.43 sq; ⌈46.3⌉ = 47; ⌈1.54⌉ = 2; hip edge 2 × (40 + 30) = 140 ft ÷ 9.833 = 14.24 → 15'],
  ['40 × 30 ft, 3/12 (low slope), #15 felt', { pitch: '3', ul: 'felt15' }, 'sq 13.6 · bundles 41 · rolls 7 · drip pcs 15',
    '√(1 + 0.25²) = 1.03078; 1,236.9 × 1.10 = 1,360.6 → 13.61 sq; ⌈40.8⌉ = 41; 2 layers: ⌈1,360.6 × 2 ÷ 400⌉ = ⌈6.8⌉ = 7; edge 80 + 60×1.031 = 141.8 ÷ 9.833 = 14.4 → 15', /two layers/],
  ['Metric 12.192 × 9.144 m (= 40 × 30 ft), 6/12', { u: 'met', l: '12.192', w: '9.144' }, 'sq 14.8 · bundles 45 · rolls 2 · drip pcs 15',
    'exactly 40 × 30 ft (1 ft = 0.3048 m) → same as row 1'],
  ['Roof-area mode: 2,000 sq ft, no edge length', { by: 'area', area: '2000' }, 'sq 22.0 · bundles 66 · rolls 3 · drip pcs —',
    '2,000 × 1.10 = 2,200 → 22 sq; 22 × 3 = 66; ⌈2.2⌉ = 3; drip edge needs eaves + rakes'],
  ['Very large: 1,000 × 1,000 ft, 12/12, 20%', { l: '1000', w: '1000', pitch: '12', waste: '20' }, 'sq 16,970.6 · bundles 50,912 · rolls 1,698 · drip pcs 492',
    '1,000,000 × 1.41421 × 1.20 = 1,697,056 sq ft → 16,970.56 sq; ⌈50,911.7⌉ = 50,912; ⌈1,697.06⌉ = 1,698; edge 2,000 + 2,000×1.4142 = 4,828.4 ÷ 9.833 = 491.03 → 492'],
  ['Pitch 1/12 (below shingle minimum)', { pitch: '1' }, 'sq 13.2 · bundles 40 · rolls 2 · drip pcs 15',
    '√(1 + (1/12)²) = 1.00347; 1,204.2 × 1.1 = 1,324.6 → 13.25 sq; ⌈39.7⌉ = 40; shows the IRC warning', /not permitted/],
  ['Invalid: width 0', { w: '0' }, '— (Must be greater than 0)', 'zero width rejected; results cleared'],
  ['Invalid: pitch 50/12', { pitch: '50' }, '— (Must be 48/12 or less)', 'above 48/12 limit'],
]);

run('fence', FENCE_DEFAULTS, evaluateFence, ['posts', 'rails', 'pickets', 'bags'], ['posts', 'rails', 'pickets', 'bags'], [
  ['100 ft, 8 ft spacing, 3 rails, 5½″ pickets no gap, 10″×30″ holes, 6″ gravel, 4×4, 80 lb', {}, 'posts 14 · rails 39 · pickets 219 · bags 22',
    '⌈100 ÷ 8⌉ = 13 sections + 1 = 14; 13 × 3 = 39; ⌈1,200 ÷ 5.5⌉ = ⌈218.2⌉ = 219; (π·5² − 3.5²) × 24 ÷ 1,728 = 0.9207 ft³ × 14 = 12.89 ÷ 0.60 = 21.5 → 22'],
  ['96 ft (exact multiple of 8 ft)', { len: '96' }, 'posts 13 · rails 36 · pickets 210 · bags 20',
    '96 ÷ 8 = 12 sections, no extra; ⌈1,152 ÷ 5.5⌉ = ⌈209.5⌉ = 210; 13 × 0.9207 = 11.97 ÷ 0.60 = 19.95 → 20'],
  ['2 corners, 6×6 posts, 12″ holes, 60 lb bags', { corners: '2', post: '6x6', dia: '12', bag: '60' }, 'posts 16 · rails 39 · pickets 219 · bags 41',
    '14 + 2 = 16; (π·6² − 5.5²) × 24 ÷ 1,728 = 1.1507 ft³ × 16 = 18.41 ÷ 0.45 = 40.9 → 41'],
  ['Pickets 3½″ with 2½″ gap (picket fence)', { pw: '3.5', gap: '2.5' }, 'posts 14 · rails 39 · pickets 200 · bags 22',
    '1,200 ÷ (3.5 + 2.5) = 200 exactly'],
  ['Metric: 30.48 m, 2.4384 m spacing, 13.97 cm pickets, 25.4 × 76.2 cm holes, 15.24 cm gravel, 30 kg', { u: 'met', len: '30.48', space: '2.4384', pw: '13.97', dia: '25.4', depth: '76.2', gravel: '15.24', bag: '30' }, 'posts 14 · rails 39 · pickets 219 · bags 26',
    'same fence as row 1 in metric; 30 kg = 66.14 lb × 0.0075 = 0.496 ft³ per bag; 12.89 ÷ 0.496 = 25.98 → 26'],
  ['Very large: 5,000 ft', { len: '5000' }, 'posts 626 · rails 1,875 · pickets 10,910 · bags 961',
    '5,000 ÷ 8 = 625 sections + 1 = 626; 625 × 3 = 1,875; ⌈60,000 ÷ 5.5⌉ = ⌈10,909.1⌉ = 10,910; 626 × 0.9207 = 576.4 ÷ 0.60 = 960.6 → 961'],
  ['Invalid: length 0', { len: '0' }, '— (Must be greater than 0)', 'zero length rejected'],
  ['Invalid: 3″ hole for a 4×4 post', { dia: '3' }, '— (Hole must be wider than the post)', 'hole must exceed 3.5″ post width'],
]);

run('deck', DECK_DEFAULTS, evaluateDeck, ['boards', 'joists', 'rim', 'screws'], ['boards', 'joists', 'rim', 'screws'], [
  ['16 × 12 ft, 5½″ boards, ⅛″ gap, 16 ft boards, 16″ o.c., 10%', {}, 'boards 29 · joists 13 · rim 2 · screws 676',
    'rows ⌈(144 + 0.125) ÷ 5.625⌉ = ⌈25.6⌉ = 26; 26 × 16 × 1.10 = 457.6 lin ft ÷ 16 = 28.6 → 29; 192 ÷ 16 + 1 = 13; 26 × 13 × 2 = 676'],
  ['Same deck, 12″ o.c., 0% waste', { js: '12', waste: '0' }, 'boards 26 · joists 17 · rim 2 · screws 884',
    '26 × 16 ÷ 16 = 26; 192 ÷ 12 + 1 = 17; 26 × 17 × 2 = 884'],
  ['Same deck, 24″ o.c. (warning)', { js: '24' }, 'boards 29 · joists 9 · rim 2 · screws 468',
    '192 ÷ 24 + 1 = 9; 26 × 9 × 2 = 468; warns: 24″ only for 2× decking (IRC Table R507.7)', /Joists wider than 16/],
  ['Metric 4.8768 × 3.6576 m, 139.7 mm boards, 3.175 mm gap, 4.8768 m boards, 400 mm', { u: 'met', len: '4.8768', dep: '3.6576', bw: '139.7', gap: '3.175', blen: '4.8768', js: '400' }, 'boards 29 · joists 14 · rim 2 · screws 728',
    'same deck as row 1; 400 mm is 15.75″ so ⌈4,876.8 ÷ 400⌉ = 13 spaces + 1 = 14 joists; 26 × 14 × 2 = 728'],
  ['Very large: 100 × 50 ft', { len: '100', dep: '50' }, 'boards 736 · joists 76 · rim 2 · screws 16,264',
    'rows ⌈600.125 ÷ 5.625⌉ = ⌈106.7⌉ = 107; 107 × 100 × 1.1 = 11,770 ÷ 16 = 735.6 → 736; 1,200 ÷ 16 + 1 = 76; 107 × 76 × 2 = 16,264'],
  ['Invalid: depth 0', { dep: '0' }, '— (Must be greater than 0)', 'zero depth rejected'],
  ['Empty: length and depth blank', { len: '', dep: '' }, '— (empty)', 'prompt shown, no numbers'],
]);

afterAll(() => {
  const out = process.env.ACCURACY_REPORT;
  if (!out) return;
  const head = '| Inputs | Calculator output | Expected | How expected was derived |\n|---|---|---|---|\n';
  const md = Object.entries(rows)
    .map(([k, r]) => `### ${k}\n\n${head}${r.join('\n')}\n`)
    .join('\n');
  writeFileSync(out, md, { flag: 'a' });
});
