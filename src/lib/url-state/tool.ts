import type { ToolState } from '../tools/types';

/** Read known keys from a query string; unknown keys are ignored, missing keys fall back to defaults. */
export function parseToolParams(params: URLSearchParams, defaults: ToolState): ToolState {
  const s: ToolState = { ...defaults };
  for (const k of Object.keys(defaults)) {
    const v = params.get(k);
    if (v !== null && v.length <= 32) s[k] = v.trim();
  }
  return s;
}

/** Serialise the full state (blank values omitted) so a shared link survives future default changes. */
export function buildToolQuery(s: ToolState, keys: string[] = Object.keys(s)): string {
  const p = new URLSearchParams();
  for (const k of keys) {
    const v = (s[k] ?? '').trim();
    if (v !== '') p.set(k, v);
  }
  return p.toString();
}
