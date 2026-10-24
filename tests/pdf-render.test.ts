import { describe, expect, it } from 'vitest';
import { jsPDF } from 'jspdf';
import { DEFAULT_PITCH_INPUTS } from '../src/lib/calc/pitch';
import { renderReportPdf } from '../src/lib/pdf/render';
import { pitchReport, toolReport } from '../src/lib/report';
import { ROOFING_DEFAULTS, roofingSpec } from '../src/lib/tools/roofing-tool';

const ctx = {
  brand: 'ExteriorMath',
  date: new Date('2026-10-24T12:00:00Z'),
  siteUrl: 'https://exteriormath.com',
  shareUrl: 'https://exteriormath.com/roof-pitch-calculator/?rise=6&run=12&u=in',
};
/** Text as it appears inside a PDF string literal: "(" and ")" are backslash-escaped. */
const pdfText = (s: string) => s.replace(/[()\\]/g, (c) => `\\${c}`);
const expectText = (raw: string, items: string[]) => {
  for (const s of items) expect(raw, s).toContain(pdfText(s));
};

describe('PDF report', () => {
  it('roof pitch PDF has tool, inputs, results, formula, date, site and share link', () => {
    const doc = renderReportPdf(jsPDF, pitchReport(DEFAULT_PITCH_INPUTS, ctx)!);
    const raw = doc.output();
    expect(raw.startsWith('%PDF-')).toBe(true);
    expectText(raw, [
      'Roof Pitch Calculator',
      'ExteriorMath',
      'Generated October 24, 2026',
      'INPUTS',
      'Rise & run',
      'RESULTS',
      '6/12',
      '26.57°',
      '50.0%',
      '1.118',
      'FORMULA USED',
      'pitch = (rise ÷ run) × 12',
      'rafter multiplier = sqrt(1 + (rise ÷ run)²)',
      'SHARE LINK',
      ctx.shareUrl,
      'Estimates for planning only. Confirm quantities with your supplier and local building code.',
    ]);
    expect(raw).toContain(`/URI (${ctx.shareUrl})`); // clickable link
    expect(doc.getNumberOfPages()).toBe(1);
  });

  it('roofing PDF has the materials list, notes and formula', () => {
    const doc = renderReportPdf(jsPDF, toolReport(roofingSpec, ROOFING_DEFAULTS, roofingSpec.evaluate(ROOFING_DEFAULTS), ctx)!);
    const raw = doc.output();
    expectText(raw, [
      'Roofing Materials Calculator',
      'Length (along the ridge)',
      '40 ft',
      'Roof squares',
      '14.8 (1,476 sq ft incl. waste)',
      'MATERIALS LIST',
      'Asphalt shingle bundles',
      '45 bundles',
      'bundles = ceil(squares × 3)',
    ]);
    expect(doc.getNumberOfPages()).toBeLessThanOrEqual(2);
  });

  it('long reports paginate with a numbered footer on every page', () => {
    const d = toolReport(roofingSpec, ROOFING_DEFAULTS, roofingSpec.evaluate(ROOFING_DEFAULTS), ctx)!;
    const long = { ...d, notes: Array.from({ length: 30 }, (_, i) => `Note line ${i + 1} with enough words to need some space on the page.`) };
    const doc = renderReportPdf(jsPDF, long);
    const n = doc.getNumberOfPages();
    expect(n).toBeGreaterThan(1);
    const raw = doc.output();
    for (let i = 1; i <= n; i++) expect(raw).toContain(`exteriormath.com · ${i}/${n}`.replace('·', '\xb7').replace('\\xb7', '·'));
    expect(raw).toContain(pdfText(ctx.shareUrl));
  });

  it('no characters outside Latin-1 reach the PDF', () => {
    const doc = renderReportPdf(jsPDF, toolReport(roofingSpec, ROOFING_DEFAULTS, roofingSpec.evaluate(ROOFING_DEFAULTS), ctx)!);
    expect(/[^\u0000-ÿ]/.test(doc.output())).toBe(false);
  });
});
