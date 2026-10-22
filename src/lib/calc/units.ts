/** Unit helpers shared by every calculator. All functions are pure. */

export const INCHES_PER_FOOT = 12;
export const CM_PER_INCH = 2.54;
export const SQ_FT_PER_SQ_M = 10.763910416709722; // 1 / 0.3048²
export const FT_PER_M = 1 / 0.3048;

/**
 * Parse a raw form value. Empty → null (field left blank), unparsable → NaN.
 */
export function parseNum(raw: string | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  const t = String(raw).trim();
  if (t === '') return null;
  const x = Number(t);
  return Number.isFinite(x) ? x : Number.NaN;
}

export function ftInToInches(ft: number, inches: number): number {
  return ft * INCHES_PER_FOOT + inches;
}

/** Split total inches into whole feet + remaining inches (inches rounded to `dp` decimals). */
export function inchesToFtIn(total: number, dp = 2): { ft: number; inches: number } {
  const f = 10 ** dp;
  let ft = Math.floor(total / INCHES_PER_FOOT);
  let inches = Math.round((total - ft * INCHES_PER_FOOT) * f) / f;
  if (inches >= INCHES_PER_FOOT) {
    ft += 1;
    inches = 0;
  }
  return { ft, inches };
}

/** Round to `dp` decimals and drop trailing zeros: 6.50 → "6.5", 6.00 → "6". */
export function trimNum(x: number, dp = 2): string {
  const f = 10 ** dp;
  const r = Math.round(x * f) / f;
  // Avoid "-0"
  return String(Object.is(r, -0) ? 0 : r);
}

/** 54 → "4′ 6″", 6 → "6″", 120.75 → "10′ 0.75″". */
export function formatFtIn(totalInches: number): string {
  const { ft, inches } = inchesToFtIn(totalInches);
  const i = trimNum(inches, 2);
  return ft ? `${ft}′ ${i}″` : `${i}″`;
}

export function cmToInches(cm: number): number {
  return cm / CM_PER_INCH;
}

export function inchesToCm(inches: number): number {
  return inches * CM_PER_INCH;
}
