/**
 * Shareable URL state for the roof pitch tool.
 *   Rise & run, imperial: ?rise=54&run=108&u=in   (total inches)
 *   Rise & run, metric:   ?rise=15&run=30&u=cm
 *   Angle:                ?angle=26.57
 *   Pitch:                ?pitch=6
 */
import { DEFAULT_PITCH_INPUTS, type PitchInputs } from '../calc/pitch';
import { inchesToFtIn, parseNum, trimNum } from '../calc/units';

const clean = (v: string | null): string | null => {
  if (v === null) return null;
  const n = parseNum(v);
  if (n === null || Number.isNaN(n)) return null;
  return trimNum(n, 4);
};

export function parsePitchParams(params: URLSearchParams): PitchInputs {
  const s: PitchInputs = { ...DEFAULT_PITCH_INPUTS };
  const angle = clean(params.get('angle'));
  const pitch = clean(params.get('pitch'));
  const rise = clean(params.get('rise'));
  const run = clean(params.get('run'));

  if (rise !== null || run !== null) {
    s.mode = 'rr';
    if (params.get('u') === 'cm') {
      s.unit = 'met';
      s.riseCm = rise ?? '';
      s.runCm = run ?? '';
    } else {
      s.unit = 'imp';
      const split = (v: string | null): [string, string] => {
        if (v === null) return ['', ''];
        const n = Number(v);
        if (n < 0) return ['0', v];
        const { ft, inches } = inchesToFtIn(n);
        return [String(ft), trimNum(inches, 2)];
      };
      [s.riseFt, s.riseIn] = split(rise);
      [s.runFt, s.runIn] = split(run);
    }
  } else if (angle !== null) {
    s.mode = 'angle';
    s.angle = angle;
  } else if (pitch !== null) {
    s.mode = 'pitch';
    s.pitch = pitch;
  }
  return s;
}

/** Query string (without "?") for the current inputs. Blank fields are omitted. */
export function buildPitchQuery(s: PitchInputs): string {
  const p = new URLSearchParams();
  if (s.mode === 'rr') {
    if (s.unit === 'imp') {
      const tot = (ft: string, inch: string) => {
        const a = parseNum(ft);
        const b = parseNum(inch);
        if (a === null && b === null) return null;
        if (Number.isNaN(a) || Number.isNaN(b)) return null;
        return trimNum((a ?? 0) * 12 + (b ?? 0), 4);
      };
      const rise = tot(s.riseFt, s.riseIn);
      const run = tot(s.runFt, s.runIn);
      if (rise !== null) p.set('rise', rise);
      if (run !== null) p.set('run', run);
      p.set('u', 'in');
    } else {
      const rise = clean(s.riseCm);
      const run = clean(s.runCm);
      if (rise !== null) p.set('rise', rise);
      if (run !== null) p.set('run', run);
      p.set('u', 'cm');
    }
  } else if (s.mode === 'angle') {
    const a = clean(s.angle);
    if (a !== null) p.set('angle', a);
  } else {
    const x = clean(s.pitch);
    if (x !== null) p.set('pitch', x);
  }
  return p.toString();
}
