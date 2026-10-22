import { describe, expect, it } from 'vitest';
import {
  angleFromRatio,
  classifyPitch,
  DEFAULT_PITCH_INPUTS,
  evaluatePitch,
  formatPitchResults,
  MSG,
  pitchChartRows,
  pitchResults,
  rafterMultiplier,
  ratioFromAngle,
  ratioFromPitch,
  ratioFromRiseRun,
  type PitchInputs,
} from '../src/lib/calc/pitch';

const inp = (o: Partial<PitchInputs>): PitchInputs => ({ ...DEFAULT_PITCH_INPUTS, ...o });

describe('pitch formulas', () => {
  it('6/12 reference values', () => {
    const r = pitchResults(ratioFromPitch(6));
    expect(r.ratio).toBe(0.5);
    expect(r.pitch).toBe(6);
    expect(r.angle).toBeCloseTo(26.56505118, 7);
    expect(r.slopePercent).toBe(50);
    expect(r.multiplier).toBeCloseTo(1.11803399, 7);
    expect(formatPitchResults(r)).toEqual({ pitch: '6/12', angle: '26.57°', slope: '50.0%', multiplier: '1.118' });
  });
  it('12/12 = 45°, √2', () => {
    const r = pitchResults(ratioFromPitch(12));
    expect(r.angle).toBeCloseTo(45, 10);
    expect(r.multiplier).toBeCloseTo(Math.SQRT2, 10);
  });
  it('4/12 and 8/12 match published tables', () => {
    expect(angleFromRatio(4 / 12)).toBeCloseTo(18.43494882, 6);
    expect(rafterMultiplier(4 / 12)).toBeCloseTo(1.05409255, 6);
    expect(angleFromRatio(8 / 12)).toBeCloseTo(33.69006753, 6);
    expect(rafterMultiplier(8 / 12)).toBeCloseTo(1.20185043, 6);
  });
  it('flat roof', () => {
    const r = pitchResults(0);
    expect(r.angle).toBe(0);
    expect(r.multiplier).toBe(1);
  });
  it('angle ↔ ratio round trip', () => {
    for (const deg of [5, 18.43, 26.57, 33.69, 45, 60, 75]) {
      expect(angleFromRatio(ratioFromAngle(deg))).toBeCloseTo(deg, 10);
    }
  });
  it('worked example: 4′6″ rise over 9′ run', () => {
    const r = ratioFromRiseRun(54, 108);
    const f = formatPitchResults(pitchResults(r));
    expect(f).toEqual({ pitch: '6/12', angle: '26.57°', slope: '50.0%', multiplier: '1.118' });
    expect(108 * rafterMultiplier(r)).toBeCloseTo(Math.hypot(54, 108), 10);
  });
  it('rejects impossible primitives', () => {
    expect(() => ratioFromRiseRun(1, 0)).toThrow();
    expect(() => ratioFromRiseRun(-1, 12)).toThrow();
    expect(() => ratioFromAngle(90)).toThrow();
    expect(() => ratioFromPitch(-1)).toThrow();
  });
  it('fractional pitch keeps two decimals', () => {
    expect(formatPitchResults(pitchResults(ratioFromAngle(30))).pitch).toBe('6.93/12');
    expect(formatPitchResults(pitchResults(ratioFromPitch(7.25))).pitch).toBe('7.25/12');
  });
  it('classification thresholds', () => {
    expect(classifyPitch(1.99)).toMatch(/^Flat/);
    expect(classifyPitch(2)).toMatch(/^Low slope/);
    expect(classifyPitch(3.99)).toMatch(/^Low slope/);
    expect(classifyPitch(4)).toMatch(/^Conventional/);
    expect(classifyPitch(9)).toMatch(/^Conventional/);
    expect(classifyPitch(9.01)).toMatch(/^Steep/);
  });
  it('chart rows', () => {
    const rows = pitchChartRows();
    expect(rows).toHaveLength(12);
    expect(rows[5].rise).toBe(6);
    expect(rows[5].pitch).toBe("6/12");
    expect(rows[5].angle).toBe('26.57°');
    expect(rows[11].multiplier).toBe('1.414');
    expect(rows[0].angle).toBe('4.76°');
  });
});

describe('evaluatePitch (validation)', () => {
  it('default inputs → 6/12', () => {
    const e = evaluatePitch(DEFAULT_PITCH_INPUTS);
    expect(e.ratio).toBe(0.5);
    expect(e.riseLabel).toBe('6″');
    expect(e.runLabel).toBe('1′ 0″');
  });
  it('empty state', () => {
    const e = evaluatePitch(inp({ riseFt: '', riseIn: '', runFt: '', runIn: '' }));
    expect(e.empty).toBe(true);
    expect(e.ratio).toBeNull();
    expect(e.errors).toEqual({});
  });
  it('inches ≥ 12 and zero run (design error state)', () => {
    const e = evaluatePitch(inp({ riseFt: '0', riseIn: '14', runFt: '0', runIn: '0' }));
    expect(e.ratio).toBeNull();
    expect(e.errors.rise).toBe(MSG.inchesLt12);
    expect(e.errors.run).toBe(MSG.runZero);
  });
  it('one side blank', () => {
    const e = evaluatePitch(inp({ riseFt: '', riseIn: '' }));
    expect(e.errors.rise).toBe(MSG.enterRise);
    expect(e.ratio).toBeNull();
  });
  it('negative / junk', () => {
    expect(evaluatePitch(inp({ riseIn: '-1' })).errors.rise).toBe(MSG.positive);
    expect(evaluatePitch(inp({ runFt: 'x' })).errors.run).toBe(MSG.positive);
  });
  it('too steep', () => {
    const e = evaluatePitch(inp({ riseFt: '5', riseIn: '0', runFt: '1', runIn: '0' }));
    expect(e.errors.rise).toBe(MSG.tooSteep);
    expect(e.ratio).toBeNull();
    expect(evaluatePitch(inp({ riseFt: '4', riseIn: '0', runFt: '1', runIn: '0' })).ratio).toBe(4);
  });
  it('metric', () => {
    const e = evaluatePitch(inp({ unit: 'met', riseCm: '15', runCm: '30' }));
    expect(e.ratio).toBe(0.5);
    expect(e.riseLabel).toBe('15 cm');
    expect(evaluatePitch(inp({ unit: 'met', riseCm: '15', runCm: '0' })).errors.run).toBe(MSG.runZero);
    expect(evaluatePitch(inp({ unit: 'met', riseCm: '', runCm: '' })).empty).toBe(true);
  });
  it('angle mode', () => {
    expect(evaluatePitch(inp({ mode: 'angle', angle: '45' })).ratio).toBeCloseTo(1, 12);
    expect(evaluatePitch(inp({ mode: 'angle', angle: '0' })).ratio).toBe(0);
    expect(evaluatePitch(inp({ mode: 'angle', angle: '76' })).errors.angle).toBe(MSG.angleRange);
    expect(evaluatePitch(inp({ mode: 'angle', angle: '-3' })).errors.angle).toBe(MSG.angleRange);
    expect(evaluatePitch(inp({ mode: 'angle', angle: '' })).empty).toBe(true);
  });
  it('pitch mode', () => {
    expect(evaluatePitch(inp({ mode: 'pitch', pitch: '9' })).ratio).toBe(0.75);
    expect(evaluatePitch(inp({ mode: 'pitch', pitch: '49' })).errors.pitch).toBe(MSG.pitchRange);
    expect(evaluatePitch(inp({ mode: 'pitch', pitch: '-1' })).errors.pitch).toBe(MSG.positive);
  });
});
