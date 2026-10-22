import { describe, expect, it } from 'vitest';
import { triangleGeometry } from '../src/lib/pitch-diagram';

describe('triangleGeometry', () => {
  it('6/12 uses full width', () => {
    const g = triangleGeometry(0.5);
    expect(g.valid).toBe(true);
    expect(g.points).toBe('40,190 340,190 340,40');
  });
  it('steep roofs are height-capped', () => {
    const g = triangleGeometry(2);
    expect(g.points).toBe('40,190 115,190 115,40');
    expect(g.riseAnchor).toBe('start');
  });
  it('null → neutral outline', () => {
    const g = triangleGeometry(null);
    expect(g.valid).toBe(false);
    expect(g.points).toBe('40,190 340,190 340,40');
  });
  it('flat roof does not divide by zero', () => {
    const g = triangleGeometry(0);
    expect(g.points).toBe('40,190 340,190 340,190');
  });
});
