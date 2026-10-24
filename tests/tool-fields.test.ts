import { describe, expect, it } from 'vitest';
import { whenMatches } from '../src/lib/tools/fields';
import { RECOMMENDED_WASTE, ROOFING_DEFAULTS, WASTE_OPTIONS, evaluateRoofing } from '../src/lib/tools/roofing-tool';

describe('whenMatches', () => {
  it('matches key=value against state', () => {
    expect(whenMatches('by=footprint', { by: 'footprint' })).toBe(true);
    expect(whenMatches('by=footprint', { by: 'area' })).toBe(false);
    expect(whenMatches('shape=hip', {})).toBe(false);
  });
  it('treats an empty or malformed condition as always true', () => {
    expect(whenMatches(undefined, {})).toBe(true);
    expect(whenMatches('', {})).toBe(true);
    expect(whenMatches('noequals', {})).toBe(true);
  });
  it('keeps values that contain "="', () => {
    expect(whenMatches('q=a=b', { q: 'a=b' })).toBe(true);
  });
  it('recommends 10% waste for a gable roof and 15% for a hip roof', () => {
    // Same conditions the Waste chips use: "shape=gable" on 10%, "shape=hip" on 15%.
    const conds = Object.entries(RECOMMENDED_WASTE).map(([shape, w]) => ({ w, when: `shape=${shape}` }));
    const tagged = (shape: string) => conds.filter((c) => whenMatches(c.when, { ...ROOFING_DEFAULTS, shape })).map((c) => c.w);
    expect(tagged('gable')).toEqual(['10']);
    expect(tagged('hip')).toEqual(['15']);
    for (const w of Object.values(RECOMMENDED_WASTE)) expect(WASTE_OPTIONS).toContain(w);
  });
  it('the hint never changes the selected waste or the results', () => {
    const hip: Record<string, string> = { ...ROOFING_DEFAULTS, shape: 'hip' };
    expect(hip.waste).toBe('10');
    expect(evaluateRoofing(hip).listMeta).toContain('10% waste');
  });
});
