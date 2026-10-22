import { describe, expect, it } from 'vitest';
import { DEFAULT_PITCH_INPUTS, evaluatePitch } from '../src/lib/calc/pitch';
import { buildPitchQuery, parsePitchParams } from '../src/lib/url-state/pitch';

const q = (s: string) => parsePitchParams(new URLSearchParams(s));

describe('pitch URL state', () => {
  it('no params → defaults', () => {
    expect(q('')).toEqual(DEFAULT_PITCH_INPUTS);
  });
  it('imperial total inches split into ft/in', () => {
    const s = q('rise=54&run=108&u=in');
    expect([s.riseFt, s.riseIn, s.runFt, s.runIn]).toEqual(['4', '6', '9', '0']);
    expect(evaluatePitch(s).ratio).toBe(0.5);
  });
  it('metric', () => {
    const s = q('rise=15&run=30&u=cm');
    expect(s.unit).toBe('met');
    expect(evaluatePitch(s).ratio).toBe(0.5);
  });
  it('angle and pitch', () => {
    expect(q('angle=30').mode).toBe('angle');
    expect(q('pitch=7.5').pitch).toBe('7.5');
  });
  it('garbage is ignored', () => {
    expect(q('pitch=abc')).toEqual(DEFAULT_PITCH_INPUTS);
  });
  it('round trips every mode', () => {
    for (const s of ['rise=54&run=108&u=in', 'rise=15&run=30&u=cm', 'angle=26.57', 'pitch=6']) {
      expect(buildPitchQuery(q(s))).toBe(s);
    }
  });
  it('defaults build the design share link', () => {
    expect(buildPitchQuery(DEFAULT_PITCH_INPUTS)).toBe('rise=6&run=12&u=in');
  });
});
