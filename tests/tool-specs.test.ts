import { describe, expect, it } from 'vitest';
import { ROOFING_DEFAULTS, convertRoofingUnits, evaluateRoofing } from '../src/lib/tools/roofing-tool';
import { FENCE_DEFAULTS, convertFenceUnits, evaluateFence } from '../src/lib/tools/fence-tool';
import { DECK_DEFAULTS, convertDeckUnits, evaluateDeck } from '../src/lib/tools/deck-tool';
import { buildToolQuery, parseToolParams } from '../src/lib/url-state/tool';
import { readNum } from '../src/lib/tools/fields';

describe('readNum', () => {
  it('validates', () => {
    const e: Record<string, string> = {};
    expect(readNum('', 'a', { required: true, label: 'length' }, e)).toBeNull();
    expect(e.a).toBe('Enter the length');
    expect(readNum('0', 'b', { gt: 0 }, e)).toBeNull();
    expect(e.b).toBe('Must be greater than 0');
    expect(readNum('2.5', 'c', { integer: true }, e)).toBeNull();
    expect(readNum('13', 'd', { max: 12, unit: 'ft' }, e)).toBeNull();
    expect(e.d).toBe('Must be 12 ft or less');
    expect(readNum('', 'opt', {}, e)).toBeNull();
    expect(e.opt).toBeUndefined();
  });
});

describe('roofing tool', () => {
  it('design example renders', () => {
    const v = evaluateRoofing(ROOFING_DEFAULTS);
    expect(v.results?.squares.value).toBe('14.8');
    expect(v.results?.squares.sub).toBe('1,476 sq ft incl. waste');
    expect(v.results?.bundles.value).toBe('45');
    expect(v.results?.underlayment.value).toBe('2');
    expect(v.results?.drip.value).toBe('15');
    expect(v.summary).toBe('40 × 30 ft footprint = 1,200 sq ft × 1.118 (6/12) = 1,342 sq ft × 1.10 waste = 1,476 sq ft');
    expect(v.list).toHaveLength(3);
  });
  it('empty / invalid states never show numbers', () => {
    expect(evaluateRoofing({ ...ROOFING_DEFAULTS, l: '', w: '', pitch: '' }).empty).toBe(true);
    const bad = evaluateRoofing({ ...ROOFING_DEFAULTS, w: '-3' });
    expect(bad.results).toBeNull();
    expect(bad.errors.w).toBeTruthy();
    expect(evaluateRoofing({ ...ROOFING_DEFAULTS, pitch: '50' }).errors.pitch).toBeTruthy();
  });
  it('roof-area mode with no edge length', () => {
    const v = evaluateRoofing({ ...ROOFING_DEFAULTS, by: 'area', area: '2000' });
    expect(v.results?.bundles.value).toBe('66'); // 2200 sq ft → 22 sq → 66
    expect(v.results?.drip.value).toBe('—');
  });
  it('warns on low slope', () => {
    expect(evaluateRoofing({ ...ROOFING_DEFAULTS, pitch: '3' }).status.tone).toBe('warn');
    expect(evaluateRoofing({ ...ROOFING_DEFAULTS, pitch: '1' }).status.text).toMatch(/not permitted/);
  });
  it('metric gives the same quantities', () => {
    const m = convertRoofingUnits(ROOFING_DEFAULTS, 'met');
    expect(m.l).toBe('12.19');
    expect(evaluateRoofing(m).results?.bundles.value).toBe('45');
    expect(convertRoofingUnits(m, 'imp').l).toBe('39.99');
  });
});

describe('fence tool', () => {
  it('defaults', () => {
    const v = evaluateFence(FENCE_DEFAULTS);
    expect(v.results?.posts.value).toBe('14');
    expect(v.results?.rails.value).toBe('39');
    expect(v.results?.pickets.value).toBe('219'); // 1200 ÷ 5.5 = 218.2
    expect(v.results?.bags.value).toBe('22');
  });
  it('hole narrower than post is an error', () => {
    expect(evaluateFence({ ...FENCE_DEFAULTS, dia: '3' }).errors.dia).toMatch(/wider/);
    expect(evaluateFence({ ...FENCE_DEFAULTS, gravel: '30' }).errors.gravel).toBeTruthy();
  });
  it('metric round trip keeps counts', () => {
    const m = convertFenceUnits(FENCE_DEFAULTS, 'met');
    expect(m.bag).toBe('30');
    const v = evaluateFence(m);
    expect(v.results?.posts.value).toBe('14');
    expect(v.results?.rails.value).toBe('39');
    expect(v.results?.pickets.value).toBe('219');
  });
});

describe('deck tool', () => {
  it('defaults', () => {
    const v = evaluateDeck(DECK_DEFAULTS);
    expect(v.results?.boards.value).toBe('29');
    expect(v.results?.joists.value).toBe('13');
    expect(v.results?.screws.value).toBe('676');
  });
  it('metric', () => {
    const m = convertDeckUnits(DECK_DEFAULTS, 'met');
    expect(m.js).toBe('400');
    expect(m.bw).toBe('139.7');
    const v = evaluateDeck(m);
    expect(v.results?.joists.value).toBe('14'); // 4877 mm ÷ 400 mm = 12.2 → 13 spaces + 1 (400 mm is tighter than 16″)
  });
});

describe('tool URL state', () => {
  it('round trip and ignores unknown keys', () => {
    const q = buildToolQuery({ ...ROOFING_DEFAULTS, pitch: '7.5' });
    const s = parseToolParams(new URLSearchParams(q + '&evil=1'), ROOFING_DEFAULTS);
    expect(s.pitch).toBe('7.5');
    expect('evil' in s).toBe(false);
    expect(q).not.toContain('area=');
  });
});
