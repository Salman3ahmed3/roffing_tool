/** Shared shape for the materials-style calculators (roofing, fence, deck). */

export type ToolState = Record<string, string>;
export type UnitSystem = 'imp' | 'met';

export interface ResultCell {
  value: string;
  sub?: string;
}

export interface ListItem {
  name: string;
  qty: string;
  unit: string;
}

export interface ToolView {
  errors: Record<string, string>;
  /** Every required field is blank. */
  empty: boolean;
  status: { text: string; tone: 'info' | 'warn' };
  /** null while empty or invalid — never stale values. */
  results: Record<string, ResultCell> | null;
  /** One-line worked calculation, e.g. "40 × 30 ft footprint = …". */
  summary: string;
  list: ListItem[];
  /** e.g. "Gable roof · 40 × 30 ft · 6/12". */
  listMeta: string;
}

export interface ToolSpec {
  id: string;
  title: string;
  defaults: ToolState;
  /** Keys whose fields are shown only when another key has a value: { area: ['by', 'area'] }. */
  evaluate(s: ToolState): ToolView;
  /** Convert length fields when the unit system changes. */
  convertUnits(s: ToolState, to: UnitSystem): ToolState;
}
