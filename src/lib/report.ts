/**
 * Data for the downloadable PDF report. Pure functions only, so the content is unit-tested;
 * the PDF drawing lives in ./pdf/render.ts and is loaded on demand.
 */
import {
  classifyPitch,
  evaluatePitch,
  formatPitchResults,
  pitchResults,
  type PitchInputs,
} from './calc/pitch';
import type { ReportRow, ToolSpec, ToolState, ToolView } from './tools/types';

export interface ReportData {
  brand: string;
  tool: string;
  /** Filename part, e.g. "roof-pitch". */
  slug: string;
  /** Filename part from the results, e.g. "6/12" → "6-12". */
  fileKey: string;
  inputs: ReportRow[];
  results: ReportRow[];
  /** Materials list (qty + unit), when the tool has one. */
  list?: ReportRow[];
  notes: string[];
  formula: string[];
  date: Date;
  siteUrl: string;
  shareUrl: string;
}

export interface ReportContext {
  brand: string;
  date: Date;
  siteUrl: string;
  shareUrl: string;
}

export const PITCH_FORMULA = [
  'pitch = (rise ÷ run) × 12',
  'angle° = atan(rise ÷ run) × 180 ÷ π',
  'slope % = (rise ÷ run) × 100',
  'rafter multiplier = √(1 + (rise ÷ run)²)',
];

/** "6/12" → "6-12", "14.8-squares" stays, "1,476" → "1476". */
export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/,/g, '')
    .replace(/[^a-z0-9.]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function reportFilename(d: Pick<ReportData, 'brand' | 'slug' | 'fileKey'>): string {
  return `${slugify(d.brand)}-${slugify(d.slug)}-${slugify(d.fileKey) || 'results'}.pdf`;
}

/**
 * PDF standard fonts (Helvetica/Courier) only cover Latin-1. Map the symbols the site uses to
 * readable equivalents and drop anything else outside Latin-1.
 */
const PDF_MAP: Record<string, string> = {
  '′': "'",
  '″': '"',
  '√': 'sqrt',
  '⌈': 'ceil(',
  '⌉': ')',
  'π': 'pi',
  '→': '->',
  '←': '<-',
  '—': ' - ',
  '–': '-',
  '−': '-',
  '‘': "'",
  '’': "'",
  '“': '"',
  '”': '"',
  '…': '...',
  '⚠': '!',
  '✓': '',
  '≥': '>=',
  '≤': '<=',
  '⅛': '1/8',
  ' ': ' ',
};
export function pdfSafe(s: string): string {
  let out = '';
  for (const ch of s) {
    if (ch in PDF_MAP) out += PDF_MAP[ch];
    else if (ch.codePointAt(0)! <= 0xff) out += ch;
    else out += '?';
  }
  return out.replace(/ {2,}/g, ' ').trim();
}

export function formatReportDate(d: Date): string {
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}

/** Report for the roof pitch tool, or null when the inputs are empty or invalid. */
export function pitchReport(s: PitchInputs, ctx: ReportContext): ReportData | null {
  const ev = evaluatePitch(s);
  if (ev.ratio === null) return null;
  const res = pitchResults(ev.ratio);
  const f = formatPitchResults(res);
  const inputs: ReportRow[] = [];
  if (s.mode === 'rr') {
    inputs.push(['Input method', 'Rise & run'], ['Units', s.unit === 'met' ? 'Metric' : 'Feet / inches']);
    inputs.push(['Rise', ev.riseLabel], ['Run', ev.runLabel]);
  } else if (s.mode === 'angle') {
    inputs.push(['Input method', 'Angle'], ['Roof angle', `${s.angle}°`]);
  } else {
    inputs.push(['Input method', 'Pitch (x/12)'], ['Pitch', `${s.pitch}/12`]);
  }
  return {
    brand: ctx.brand,
    tool: 'Roof Pitch Calculator',
    slug: 'roof-pitch',
    fileKey: f.pitch,
    inputs,
    results: [
      ['Pitch', f.pitch],
      ['Angle', f.angle],
      ['Slope', f.slope],
      ['Rafter multiplier', f.multiplier],
    ],
    notes: [classifyPitch(res.pitch)],
    formula: PITCH_FORMULA,
    date: ctx.date,
    siteUrl: ctx.siteUrl,
    shareUrl: ctx.shareUrl,
  };
}

/** Report for a materials-style tool (roofing, fence, deck), or null when there are no results. */
export function toolReport(spec: ToolSpec, s: ToolState, v: ToolView, ctx: ReportContext): ReportData | null {
  if (!v.results) return null;
  const results: ReportRow[] = Object.entries(spec.resultLabels).map(([key, label]) => {
    const r = v.results![key];
    return [label, r ? (r.sub ? `${r.value} (${r.sub})` : r.value) : '—'];
  });
  return {
    brand: ctx.brand,
    tool: spec.toolName,
    slug: spec.slug,
    fileKey: spec.fileKey(v),
    inputs: spec.describeInputs(s),
    results,
    list: v.list.map((i) => [i.name, `${i.qty} ${i.unit}`] as ReportRow),
    notes: [v.status.text, v.summary].filter(Boolean),
    formula: spec.formula,
    date: ctx.date,
    siteUrl: ctx.siteUrl,
    shareUrl: ctx.shareUrl,
  };
}

/** Plain-text outline of the report, in drawing order. Used by the renderer and by tests. */
export interface ReportSection {
  heading: string;
  rows?: ReportRow[];
  lines?: string[];
  mono?: boolean;
}

export function reportSections(d: ReportData): ReportSection[] {
  const out: ReportSection[] = [
    { heading: 'Inputs', rows: d.inputs },
    { heading: 'Results', rows: d.results },
  ];
  if (d.list && d.list.length) out.push({ heading: 'Materials list', rows: d.list });
  if (d.notes.length) out.push({ heading: 'Notes', lines: d.notes });
  out.push({ heading: 'Formula used', lines: d.formula, mono: true });
  out.push({ heading: 'Share link', lines: [d.shareUrl] });
  return out;
}
