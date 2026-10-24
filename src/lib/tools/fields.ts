import { parseNum } from '../calc/units';

export interface NumRule {
  label?: string;
  required?: boolean;
  min?: number;
  /** Strictly greater than. */
  gt?: number;
  max?: number;
  integer?: boolean;
  unit?: string;
}

/**
 * Parse and validate one numeric field. Returns the number, null when blank-and-optional,
 * or records an error message in `errors[key]`.
 */
export function readNum(raw: string | undefined, key: string, rule: NumRule, errors: Record<string, string>): number | null {
  const v = parseNum(raw ?? '');
  const u = rule.unit ? (rule.unit.startsWith('/') ? rule.unit : ` ${rule.unit}`) : '';
  if (v === null) {
    if (rule.required) errors[key] = rule.label ? `Enter the ${rule.label}` : 'Required';
    return null;
  }
  if (Number.isNaN(v)) {
    errors[key] = 'Enter a number';
    return null;
  }
  if (rule.integer && !Number.isInteger(v)) {
    errors[key] = 'Use a whole number';
    return null;
  }
  if (rule.gt !== undefined && !(v > rule.gt)) {
    errors[key] = rule.gt === 0 ? 'Must be greater than 0' : `Must be greater than ${rule.gt}${u}`;
    return null;
  }
  if (rule.min !== undefined && v < rule.min) {
    errors[key] = rule.min === 0 ? 'Use a positive number' : `Must be at least ${rule.min}${u}`;
    return null;
  }
  if (rule.max !== undefined && v > rule.max) {
    errors[key] = `Must be ${rule.max}${u} or less`;
    return null;
  }
  return v;
}

/** True when every listed field is blank. */
export function allBlank(s: Record<string, string>, keys: string[]): boolean {
  return keys.every((k) => (s[k] ?? '').trim() === '');
}

/**
 * Evaluates a "key=value" condition against the tool state, e.g. "by=footprint" or "shape=hip".
 * Used for conditional fields and hints; an empty condition always matches.
 */
export function whenMatches(expr: string | undefined, s: Record<string, string>): boolean {
  if (!expr) return true;
  const i = expr.indexOf('=');
  if (i < 1) return true;
  return s[expr.slice(0, i)] === expr.slice(i + 1);
}
