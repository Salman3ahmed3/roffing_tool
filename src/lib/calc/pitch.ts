/**
 * Roof pitch formulas.
 *
 * Everything is expressed through the slope ratio r = rise ÷ run:
 *   pitch (x/12)      = r × 12
 *   angle (degrees)   = atan(r) × 180 ÷ π
 *   slope (%)         = r × 100
 *   rafter multiplier = √(1 + r²)     (sloped length ÷ horizontal run)
 */
import { ftInToInches, formatFtIn, parseNum, trimNum } from './units';

/** 48/12 (≈75.96°) is treated as the steepest pitch a roofing tool should accept. */
export const MAX_RATIO = 4;
export const MAX_PITCH = MAX_RATIO * 12;
export const MAX_ANGLE = 75;

export type PitchMode = 'rr' | 'angle' | 'pitch';
export type LengthUnit = 'imp' | 'met';

export interface PitchResults {
  ratio: number;
  /** Inches of rise per 12 inches of run. */
  pitch: number;
  angle: number;
  slopePercent: number;
  multiplier: number;
}

export function ratioFromRiseRun(rise: number, run: number): number {
  if (!(run > 0)) throw new RangeError('run must be > 0');
  if (rise < 0) throw new RangeError('rise must be ≥ 0');
  return rise / run;
}

export function ratioFromAngle(deg: number): number {
  if (!(deg >= 0 && deg < 90)) throw new RangeError('angle must be in [0, 90)');
  return Math.tan((deg * Math.PI) / 180);
}

export function ratioFromPitch(x: number): number {
  if (!(x >= 0)) throw new RangeError('pitch must be ≥ 0');
  return x / 12;
}

export function pitchFromRatio(r: number): number {
  return r * 12;
}

export function angleFromRatio(r: number): number {
  return (Math.atan(r) * 180) / Math.PI;
}

export function slopePercentFromRatio(r: number): number {
  return r * 100;
}

export function rafterMultiplier(r: number): number {
  return Math.sqrt(1 + r * r);
}

export function pitchResults(r: number): PitchResults {
  return {
    ratio: r,
    pitch: pitchFromRatio(r),
    angle: angleFromRatio(r),
    slopePercent: slopePercentFromRatio(r),
    multiplier: rafterMultiplier(r),
  };
}

export interface FormattedPitch {
  pitch: string;
  angle: string;
  slope: string;
  multiplier: string;
}

export function formatPitchResults(res: PitchResults): FormattedPitch {
  return {
    pitch: `${trimNum(res.pitch, 2)}/12`,
    angle: `${res.angle.toFixed(2)}°`,
    slope: `${res.slopePercent.toFixed(1)}%`,
    multiplier: res.multiplier.toFixed(3),
  };
}

/** Short advisory line shown under the inputs. Thresholds on pitch x/12. */
export function classifyPitch(pitch: number): string {
  if (pitch < 2) return 'Flat / low slope. Asphalt shingles need at least 2/12 (IRC R905.2.2).';
  if (pitch < 4) return 'Low slope. Shingles allowed with double underlayment (IRC R905.2.2).';
  if (pitch <= 9) return 'Conventional slope. Standard shingle installation.';
  return 'Steep slope. Plan for roof jacks and fall protection.';
}

/* ───────────────────────── Input evaluation (validation) ───────────────────────── */

export interface PitchInputs {
  mode: PitchMode;
  unit: LengthUnit;
  riseFt: string;
  riseIn: string;
  runFt: string;
  runIn: string;
  riseCm: string;
  runCm: string;
  angle: string;
  pitch: string;
}

export interface PitchErrors {
  rise?: string;
  run?: string;
  angle?: string;
  pitch?: string;
}

export interface PitchEvaluation {
  /** null when empty or invalid. Never a stale value. */
  ratio: number | null;
  empty: boolean;
  errors: PitchErrors;
  /** Labels for the diagram, e.g. "4′ 6″" or "30 cm". */
  riseLabel: string;
  runLabel: string;
}

export const DEFAULT_PITCH_INPUTS: PitchInputs = {
  mode: 'rr',
  unit: 'imp',
  riseFt: '0',
  riseIn: '6',
  runFt: '1',
  runIn: '0',
  riseCm: '15',
  runCm: '30',
  angle: '26.57',
  pitch: '6',
};

export const MSG = {
  enterRise: 'Enter the rise',
  enterRun: 'Enter the run',
  positive: 'Use a positive number',
  inchesLt12: 'Inches must be less than 12 — add a foot instead',
  runZero: 'Run must be greater than 0',
  tooSteep: 'Steeper than 48/12 — check the measurement',
  angleRange: `Enter an angle between 0° and ${MAX_ANGLE}°`,
  pitchRange: `Pitches above ${MAX_PITCH}/12 are outside roofing range`,
} as const;

const isBad = (v: number | null) => v !== null && (Number.isNaN(v) || v < 0);

export function evaluatePitch(s: PitchInputs): PitchEvaluation {
  const errors: PitchErrors = {};
  let ratio: number | null = null;
  let empty = false;
  let riseLabel = '';
  let runLabel = '';

  if (s.mode === 'rr') {
    if (s.unit === 'imp') {
      const a = parseNum(s.riseFt);
      const b = parseNum(s.riseIn);
      const c = parseNum(s.runFt);
      const d = parseNum(s.runIn);
      const riseEmpty = a === null && b === null;
      const runEmpty = c === null && d === null;
      if (riseEmpty && runEmpty) {
        empty = true;
      } else {
        if (riseEmpty) errors.rise = MSG.enterRise;
        else if (isBad(a) || isBad(b)) errors.rise = MSG.positive;
        else if ((b ?? 0) >= 12) errors.rise = MSG.inchesLt12;

        if (runEmpty) errors.run = MSG.enterRun;
        else if (isBad(c) || isBad(d)) errors.run = MSG.positive;
        else if ((d ?? 0) >= 12) errors.run = MSG.inchesLt12;

        const rise = ftInToInches(a ?? 0, b ?? 0);
        const run = ftInToInches(c ?? 0, d ?? 0);
        if (!errors.run && run === 0) errors.run = MSG.runZero;
        if (!errors.rise && !errors.run) {
          ratio = rise / run;
          riseLabel = formatFtIn(rise);
          runLabel = formatFtIn(run);
        }
      }
    } else {
      const a = parseNum(s.riseCm);
      const c = parseNum(s.runCm);
      if (a === null && c === null) {
        empty = true;
      } else {
        if (a === null) errors.rise = MSG.enterRise;
        else if (isBad(a)) errors.rise = MSG.positive;
        if (c === null) errors.run = MSG.enterRun;
        else if (isBad(c)) errors.run = MSG.positive;
        else if (c === 0) errors.run = MSG.runZero;
        if (!errors.rise && !errors.run && a !== null && c !== null) {
          ratio = a / c;
          riseLabel = `${trimNum(a, 2)} cm`;
          runLabel = `${trimNum(c, 2)} cm`;
        }
      }
    }
    if (ratio !== null && ratio > MAX_RATIO) {
      errors.rise = MSG.tooSteep;
      ratio = null;
    }
  } else if (s.mode === 'angle') {
    const a = parseNum(s.angle);
    if (a === null) empty = true;
    else if (Number.isNaN(a) || a < 0 || a > MAX_ANGLE) errors.angle = MSG.angleRange;
    else {
      ratio = ratioFromAngle(a);
      riseLabel = `${trimNum(ratio * 12, 2)}″`;
      runLabel = '12″';
    }
  } else {
    const p = parseNum(s.pitch);
    if (p === null) empty = true;
    else if (Number.isNaN(p) || p < 0) errors.pitch = MSG.positive;
    else if (p > MAX_PITCH) errors.pitch = MSG.pitchRange;
    else {
      ratio = ratioFromPitch(p);
      riseLabel = `${trimNum(p, 2)}″`;
      runLabel = '12″';
    }
  }

  return { ratio, empty, errors, riseLabel, runLabel };
}

/** The four standard rows for the pitch chart (1/12 … 12/12, or any list). */
export function pitchChartRows(pitches: number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]) {
  return pitches.map((p) => {
    const f = formatPitchResults(pitchResults(ratioFromPitch(p)));
    return { rise: p, ...f };
  });
}
