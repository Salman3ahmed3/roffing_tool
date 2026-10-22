import { describe, expect, it } from 'vitest';
import { formatFtIn, ftInToInches, inchesToFtIn, parseNum, trimNum } from '../src/lib/calc/units';

describe('units', () => {
  it('parseNum: blank → null, junk → NaN, numbers parse', () => {
    expect(parseNum('')).toBeNull();
    expect(parseNum('  ')).toBeNull();
    expect(parseNum(null)).toBeNull();
    expect(parseNum('abc')).toBeNaN();
    expect(parseNum('6.5')).toBe(6.5);
    expect(parseNum('-2')).toBe(-2);
  });
  it('ft/in round trip', () => {
    expect(ftInToInches(4, 6)).toBe(54);
    expect(inchesToFtIn(54)).toEqual({ ft: 4, inches: 6 });
    expect(inchesToFtIn(6)).toEqual({ ft: 0, inches: 6 });
    expect(inchesToFtIn(11.999)).toEqual({ ft: 1, inches: 0 });
  });
  it('formatFtIn', () => {
    expect(formatFtIn(54)).toBe('4′ 6″');
    expect(formatFtIn(6)).toBe('6″');
    expect(formatFtIn(12)).toBe('1′ 0″');
    expect(formatFtIn(120.75)).toBe('10′ 0.75″');
  });
  it('trimNum', () => {
    expect(trimNum(6)).toBe('6');
    expect(trimNum(6.5)).toBe('6.5');
    expect(trimNum(6.004)).toBe('6');
    expect(trimNum(-0.0001)).toBe('0');
  });
});

describe('inchesToFtIn precision', () => {
  it('accepts a decimals argument', () => {
    expect(inchesToFtIn(6.9282, 3)).toEqual({ ft: 0, inches: 6.928 });
    expect(inchesToFtIn(11.9996, 3)).toEqual({ ft: 1, inches: 0 });
  });
});
