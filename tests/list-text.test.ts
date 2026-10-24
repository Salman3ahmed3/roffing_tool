import { describe, expect, it } from 'vitest';
import { SPECS } from '../src/lib/tools/registry';
import { MAILTO_LIMIT, buildListText, buildMailto, calcLines, listItemLine, toolListData } from '../src/lib/tools/list-text';
import type { ToolState } from '../src/lib/tools/types';

const date = new Date('2026-10-24T12:00:00Z');
const data = (id: keyof typeof SPECS, s: ToolState = SPECS[id].defaults) => {
  const spec = SPECS[id];
  return toolListData(spec, s, spec.evaluate(s), { brand: 'ExteriorMath', date, url: `https://exteriormath.com/${id}-calculator/?u=imp` })!;
};

describe('list text', () => {
  it('fence: matches the target format exactly', () => {
    expect(buildListText(data('fence'))).toBe(
      [
        'ExteriorMath · Fence materials list',
        'Oct 24, 2026',
        '',
        'YOUR FENCE',
        'Length: 100 ft',
        'Post spacing: 8 ft',
        'Rails: 3 per section',
        '',
        'SHOPPING LIST',
        '☐ 14 × Posts, 4×4',
        '☐ 39 × Rails, 8 ft',
        '☐ 219 × Pickets',
        '☐ 22 × Concrete mix, 80 lb bags',
        '☐ 3.8 ft³ Gravel for post holes',
        '',
        'Not included: gates, post caps, brackets and fasteners.',
        '',
        'HOW IT WAS CALCULATED',
        '100 ft ÷ 8 ft = 13 sections',
        '13 sections → 14 posts',
        '0.9 ft³ concrete per post ÷ 0.60 ft³ per bag = 22 bags',
        '',
        'Open or edit this calculation:',
        'https://exteriormath.com/fence-calculator/?u=imp',
      ].join('\n'),
    );
  });

  it('roofing: footprint inputs, counts with ×, rolls as a measured amount, stepped calculation', () => {
    const t = buildListText(data('roofing'));
    expect(t).toContain('YOUR ROOF\nFootprint: 40 × 30 ft\nPitch: 6/12\nRoof shape: Gable\nWaste: 10%\nUnderlayment: Synthetic, 10-square roll');
    expect(t).toContain('SHOPPING LIST\n☐ 45 × Asphalt shingle bundles\n☐ 2 rolls Synthetic underlayment\n☐ 15 × Drip edge, 10 ft');
    expect(t).toContain('Not included: starter strip, ridge cap, flashing and fasteners.');
    expect(t).toContain('HOW IT WAS CALCULATED\n40 × 30 ft footprint = 1,200 sq ft\n1,200 sq ft × 1.118 (6/12) = 1,342 sq ft\n1,342 sq ft × 1.10 waste = 1,476 sq ft');
    expect(SPECS.roofing.listText.subject(SPECS.roofing.defaults)).toBe('Roofing materials list · 40 × 30 ft');
  });

  it('roofing: roof-area mode uses the area in the inputs and subject', () => {
    const s = { ...SPECS.roofing.defaults, by: 'area', area: '1500', edge: '160' };
    const t = buildListText(data('roofing', s));
    expect(t).toContain('Roof area: 1500 sq ft\nEaves + rakes: 160 ft');
    expect(t).toContain('1,500 sq ft roof area × 1.10 waste = 1,650 sq ft\n1,650 sq ft = 16.50 squares');
    expect(SPECS.roofing.listText.subject(s)).toBe('Roofing materials list · 1500 sq ft');
  });

  it('deck: inputs, list and calculation', () => {
    const t = buildListText(data('deck'));
    expect(t).toContain('YOUR DECK\nSize: 16 × 12 ft\nBoards: 5.5 in wide, 16 ft long\nJoist spacing: 16″ on center\nWaste: 10%');
    expect(t).toContain('☐ 29 × Deck boards, 16 ft\n☐ 13 × Joists, 12 ft\n☐ 2 × Rim joists, 16 ft\n☐ 676 × Deck screws');
    expect(t).toContain('HOW IT WAS CALCULATED\n192 sq ft deck\n26 rows × 16 ft × 1.10 waste = 458 lin ft\n458 lin ft ÷ 16 ft = 29 boards');
    expect(SPECS.deck.listText.subject(SPECS.deck.defaults)).toBe('Deck materials list · 16 × 12 ft');
  });

  it('never aligns with tabs or runs of spaces', () => {
    for (const id of ['fence', 'roofing', 'deck'] as const) {
      const t = buildListText(data(id), { results: true });
      expect(t).not.toMatch(/\t| {2,}/);
    }
  });

  it('Copy results adds a RESULTS section; the email does not', () => {
    const d = data('fence');
    expect(buildListText(d, { results: true })).toContain('RESULTS\nPosts: 14 (4×4 · 13 sections)\nRails: 39');
    expect(buildListText(d)).not.toContain('RESULTS');
  });

  it('metric fence lines use metric units and m³ as a measured amount', () => {
    const s = SPECS.fence.convertUnits(SPECS.fence.defaults, 'met');
    const t = buildListText(data('fence', s));
    expect(t).toContain('Length: 30.48 m');
    expect(t).toMatch(/☐ [\d.]+ m³ Gravel for post holes/);
    expect(SPECS.fence.listText.subject(s)).toBe('Fence materials list · 30.48 m');
  });

  it('returns null while results are invalid', () => {
    const spec = SPECS.fence;
    const s = { ...spec.defaults, len: '' };
    expect(toolListData(spec, s, spec.evaluate(s), { brand: 'x', date, url: 'u' })).toBeNull();
  });
});

describe('listItemLine', () => {
  it('uses × for counts and amount + unit for measured items', () => {
    expect(listItemLine({ name: 'Pickets', qty: '219', unit: 'pickets' })).toBe('☐ 219 × Pickets');
    expect(listItemLine({ name: 'Gravel for post holes', qty: '3.8', unit: 'ft³' })).toBe('☐ 3.8 ft³ Gravel for post holes');
  });
});

describe('calcLines', () => {
  it('splits at ·, → and each = in a chain', () => {
    expect(calcLines('a = 1 → 2 · b ÷ c = 3')).toEqual(['a = 1', '1 → 2', 'b ÷ c = 3']);
    expect(calcLines('')).toEqual([]);
  });
});

describe('buildMailto', () => {
  it('encodes subject and CRLF body and stays under the limit with defaults', () => {
    for (const id of ['fence', 'roofing', 'deck'] as const) {
      const d = data(id);
      const m = buildMailto(d, SPECS[id].listText.subject(SPECS[id].defaults));
      expect(m.href.startsWith('mailto:?subject=')).toBe(true);
      expect(m.href).toContain('%0D%0A');
      expect(m.href.length).toBeLessThanOrEqual(MAILTO_LIMIT);
      expect(m.calcDropped).toBe(false);
      expect(decodeURIComponent(m.href.split('&body=')[1])).toContain('HOW IT WAS CALCULATED');
    }
  });
  it('drops HOW IT WAS CALCULATED when the URL would be too long', () => {
    const d = data('fence');
    const long = { ...d, list: Array.from({ length: 40 }, (_, i) => ({ name: `Item number ${i} with a long name`, qty: String(i + 1), unit: 'pieces' })) };
    const m = buildMailto(long, 'Fence materials list · 100 ft');
    expect(m.calcDropped).toBe(true);
    expect(m.body).not.toContain('HOW IT WAS CALCULATED');
    expect(buildListText(long)).toContain('HOW IT WAS CALCULATED');
  });
});
