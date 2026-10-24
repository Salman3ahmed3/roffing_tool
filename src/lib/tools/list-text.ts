/**
 * Plain-text materials list shared by "Email list", the no-mail-app clipboard fallback and
 * "Copy results". Mail apps show plain text in a proportional font, so nothing is aligned with
 * spaces: quantity-first lines, CAPITAL section headings, one value per line, blank lines between.
 */
import type { ListItem, ToolSpec, ToolState, ToolView } from './types';

export interface ListTextData {
  brand: string;
  /** e.g. "Fence materials" */
  title: string;
  date: Date;
  /** e.g. "YOUR FENCE" */
  inputsHeading: string;
  inputs: [label: string, value: string][];
  /** Optional, used by "Copy results": [label, "value (sub)"]. */
  results?: [label: string, value: string][];
  list: ListItem[];
  /** e.g. "gates, post caps, brackets and fasteners" */
  notIncluded: string;
  /** The one-line worked calculation shown under the results. */
  summary: string;
  url: string;
}

export interface ListTextOptions {
  /** Include "HOW IT WAS CALCULATED" (dropped from long emails). Default true. */
  calc?: boolean;
  /** Include a RESULTS section (used by "Copy results"). Default false. */
  results?: boolean;
}

/** Units that are amounts of something rather than a count of pieces. */
const MEASURED_UNITS = new Set(['ft³', 'm³', 'yd³', 'rolls', 'sq ft', 'm²', 'lin ft']);

/** "14 × Posts, 4×4" for counts; "3.8 ft³ Gravel for post holes" for measured amounts. */
export function listItemLine(it: ListItem, box = '☐ '): string {
  return MEASURED_UNITS.has(it.unit) ? `${box}${it.qty} ${it.unit} ${it.name}` : `${box}${it.qty} × ${it.name}`;
}

/** Leading value of an expression: "1,200 sq ft × 1.118 (6/12)" → "1,200 sq ft". */
function leadingValue(part: string): string {
  const m = part.match(/^(.*?)\s[×÷]\s/);
  return (m ? m[1] : part).trim();
}

/**
 * Split the one-line calculation into short steps at "·", "→" and each "=" in a chain:
 *   "100 ft ÷ 8 ft = 13 sections → 14 posts · 0.9 ft³ … = 22 bags"
 *   → ["100 ft ÷ 8 ft = 13 sections", "13 sections → 14 posts", "0.9 ft³ … = 22 bags"]
 */
export function calcLines(summary: string): string[] {
  const out: string[] = [];
  for (const group of summary.split(/\s·\s/).map((s) => s.trim()).filter(Boolean)) {
    let prevResult = '';
    group.split(/\s→\s/).forEach((seg, i) => {
      const parts = seg.split(/\s=\s/).map((p) => p.trim());
      const start = i > 0 && prevResult ? `${prevResult} → ` : '';
      if (parts.length === 1) {
        out.push(`${start}${parts[0]}`);
        prevResult = leadingValue(parts[0]);
        return;
      }
      for (let k = 0; k < parts.length - 1; k++) {
        const left = k === 0 ? `${start}${parts[0]}` : parts[k];
        out.push(`${left} = ${leadingValue(parts[k + 1])}`);
      }
      prevResult = leadingValue(parts[parts.length - 1]);
    });
  }
  return out;
}

export const formatListDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export function buildListText(d: ListTextData, opts: ListTextOptions = {}): string {
  const { calc = true, results = false } = opts;
  const blocks: string[][] = [
    [`${d.brand} · ${d.title} list`, formatListDate(d.date)],
    [d.inputsHeading, ...d.inputs.map(([k, v]) => `${k}: ${v}`)],
  ];
  if (results && d.results?.length) blocks.push(['RESULTS', ...d.results.map(([k, v]) => `${k}: ${v}`)]);
  blocks.push(['SHOPPING LIST', ...d.list.map((it) => listItemLine(it))]);
  if (d.notIncluded) blocks.push([`Not included: ${d.notIncluded.replace(/\.$/, '')}.`]);
  const steps = calcLines(d.summary);
  if (calc && steps.length) blocks.push(['HOW IT WAS CALCULATED', ...steps]);
  blocks.push(['Open or edit this calculation:', d.url]);
  return blocks.map((b) => b.join('\n')).join('\n\n');
}

/** Some mail apps cut mailto URLs much longer than this. */
export const MAILTO_LIMIT = 1800;

export function buildMailto(d: ListTextData, subject: string): { href: string; body: string; calcDropped: boolean } {
  const href = (body: string) =>
    `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body.replace(/\n/g, '\r\n'))}`;
  let body = buildListText(d);
  if (href(body).length <= MAILTO_LIMIT) return { href: href(body), body, calcDropped: false };
  body = buildListText(d, { calc: false });
  return { href: href(body), body, calcDropped: true };
}

/** Gather the list text for a tool from its current state and view. null while results are invalid. */
export function toolListData(
  spec: ToolSpec,
  s: ToolState,
  v: ToolView,
  ctx: { brand: string; date: Date; url: string },
): ListTextData | null {
  if (!v.results) return null;
  return {
    brand: ctx.brand,
    title: spec.title,
    date: ctx.date,
    inputsHeading: spec.listText.inputsHeading,
    inputs: spec.listText.inputs(s),
    results: Object.entries(spec.resultLabels).flatMap(([key, label]): [string, string][] => {
      const r = v.results?.[key];
      return r ? [[label, r.sub ? `${r.value} (${r.sub})` : r.value]] : [];
    }),
    list: v.list,
    notIncluded: spec.listText.notIncluded,
    summary: v.summary,
    url: ctx.url,
  };
}
