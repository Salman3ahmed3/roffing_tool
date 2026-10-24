import { describe, expect, it } from 'vitest';
import { DEFAULT_PITCH_INPUTS } from '../src/lib/calc/pitch';
import { pdfSafe, pitchReport, reportFilename, reportSections, slugify, toolReport } from '../src/lib/report';
import { ROOFING_DEFAULTS, roofingSpec } from '../src/lib/tools/roofing-tool';
import { FENCE_DEFAULTS, fenceSpec } from '../src/lib/tools/fence-tool';
import { DECK_DEFAULTS, deckSpec } from '../src/lib/tools/deck-tool';

const ctx = { brand: 'ExteriorMath', date: new Date('2026-10-24T12:00:00Z'), siteUrl: 'https://exteriormath.com', shareUrl: 'https://exteriormath.com/roof-pitch-calculator/?rise=6&run=12&u=in' };

describe('report helpers', () => {
  it('slugify and filenames', () => {
    expect(slugify('6/12')).toBe('6-12');
    expect(slugify('7.25/12')).toBe('7.25-12');
    expect(slugify('16,970.6-squares')).toBe('16970.6-squares');
    expect(reportFilename({ brand: 'ExteriorMath', slug: 'roof-pitch', fileKey: '6/12' })).toBe('exteriormath-roof-pitch-6-12.pdf');
    expect(reportFilename({ brand: 'ExteriorMath', slug: 'roofing', fileKey: '' })).toBe('exteriormath-roofing-results.pdf');
  });
  it('pdfSafe maps symbols outside Latin-1 and keeps Latin-1 ones', () => {
    expect(pdfSafe('Rise 4′ 6″ over run 9′ 0″')).toBe(`Rise 4' 6" over run 9' 0"`);
    expect(pdfSafe('multiplier = √(1 + r²)')).toBe('multiplier = sqrt(1 + r²)');
    expect(pdfSafe('bundles = ⌈squares × 3⌉ · 26.57° ÷ 2')).toBe('bundles = ceil(squares × 3) · 26.57° ÷ 2');
    expect(pdfSafe('angle = atan × 180 ÷ π — ok → ✓')).toBe('angle = atan × 180 ÷ pi - ok ->');
    expect(pdfSafe('漢')).toBe('?');
  });
});

describe('pitchReport', () => {
  it('defaults (rise & run) → 6/12 with all four results and the formula', () => {
    const r = pitchReport(DEFAULT_PITCH_INPUTS, ctx)!;
    expect(r.tool).toBe('Roof Pitch Calculator');
    expect(reportFilename(r)).toBe('exteriormath-roof-pitch-6-12.pdf');
    expect(r.inputs).toEqual([
      ['Input method', 'Rise & run'],
      ['Units', 'Feet / inches'],
      ['Rise', '6″'],
      ['Run', '1′ 0″'],
    ]);
    expect(r.results).toEqual([
      ['Pitch', '6/12'],
      ['Angle', '26.57°'],
      ['Slope', '50.0%'],
      ['Rafter multiplier', '1.118'],
    ]);
    expect(r.formula).toHaveLength(4);
    expect(r.notes[0]).toMatch(/Conventional slope/);
    expect(r.shareUrl).toBe(ctx.shareUrl);
  });
  it('angle and pitch modes describe their own inputs', () => {
    expect(pitchReport({ ...DEFAULT_PITCH_INPUTS, mode: 'angle', angle: '30' }, ctx)!.inputs).toEqual([['Input method', 'Angle'], ['Roof angle', '30°']]);
    const p = pitchReport({ ...DEFAULT_PITCH_INPUTS, mode: 'pitch', pitch: '7.25' }, ctx)!;
    expect(p.inputs[1]).toEqual(['Pitch', '7.25/12']);
    expect(reportFilename(p)).toBe('exteriormath-roof-pitch-7.25-12.pdf');
  });
  it('invalid inputs give no report', () => {
    expect(pitchReport({ ...DEFAULT_PITCH_INPUTS, runFt: '0', runIn: '0' }, ctx)).toBeNull();
  });
});

describe('toolReport', () => {
  it('roofing: inputs, results with detail, materials list and formula', () => {
    const r = toolReport(roofingSpec, ROOFING_DEFAULTS, roofingSpec.evaluate(ROOFING_DEFAULTS), ctx)!;
    expect(r.tool).toBe('Roofing Materials Calculator');
    expect(reportFilename(r)).toBe('exteriormath-roofing-14.8-squares.pdf');
    expect(r.inputs).toContainEqual(['Length (along the ridge)', '40 ft']);
    expect(r.inputs).toContainEqual(['Pitch', '6/12']);
    expect(r.inputs).toContainEqual(['Underlayment', 'Synthetic, 10-square roll']);
    expect(r.results[0]).toEqual(['Roof squares', '14.8 (1,476 sq ft incl. waste)']);
    expect(r.results[1]).toEqual(['Bundles', '45 (3 per square)']);
    expect(r.list).toContainEqual(['Asphalt shingle bundles', '45 bundles']);
    expect(r.notes.some((n) => n.startsWith('40 × 30 ft footprint'))).toBe(true);
    expect(r.formula[0]).toContain('roof area');
  });
  it('fence and deck keys', () => {
    expect(reportFilename(toolReport(fenceSpec, FENCE_DEFAULTS, fenceSpec.evaluate(FENCE_DEFAULTS), ctx)!)).toBe('exteriormath-fence-14-posts.pdf');
    const d = toolReport(deckSpec, DECK_DEFAULTS, deckSpec.evaluate(DECK_DEFAULTS), ctx)!;
    expect(reportFilename(d)).toBe('exteriormath-deck-29-boards.pdf');
    expect(d.inputs).toContainEqual(['Joist spacing', '16″ on center']);
  });
  it('no results → no report', () => {
    const s = { ...ROOFING_DEFAULTS, w: '-1' };
    expect(toolReport(roofingSpec, s, roofingSpec.evaluate(s), ctx)).toBeNull();
  });
  it('sections come in a fixed order and end with the share link', () => {
    const r = toolReport(roofingSpec, ROOFING_DEFAULTS, roofingSpec.evaluate(ROOFING_DEFAULTS), ctx)!;
    expect(reportSections(r).map((s) => s.heading)).toEqual(['Inputs', 'Results', 'Materials list', 'Notes', 'Formula used', 'Share link']);
    const p = pitchReport(DEFAULT_PITCH_INPUTS, ctx)!;
    expect(reportSections(p).map((s) => s.heading)).toEqual(['Inputs', 'Results', 'Notes', 'Formula used', 'Share link']);
  });
});
