import { describe, expect, it } from 'vitest';
import { bagYieldCuFt, concretePerPostCuFt, defaultRails, fenceMaterials, type FenceInput } from '../src/lib/calc/fence';

const base: FenceInput = {
  lengthFt: 100,
  postSpacingFt: 8,
  railsPerSection: 3,
  picketWidthIn: 5.5,
  picketGapIn: 0.5,
  corners: 0,
  holeDiameterIn: 10,
  holeDepthIn: 30,
  gravelIn: 6,
  postWidthIn: 3.5,
  bagLb: 80,
};

describe('fenceMaterials', () => {
  it('100 ft straight run, 8 ft spacing', () => {
    const r = fenceMaterials(base);
    expect(r.sections).toBe(13); // ⌈12.5⌉
    expect(r.posts).toBe(14);
    expect(r.rails).toBe(39);
    expect(r.pickets).toBe(200); // 1200″ ÷ 6″
  });
  it('exact multiple of spacing does not add a section', () => {
    const r = fenceMaterials({ ...base, lengthFt: 96 });
    expect(r.sections).toBe(12);
    expect(r.posts).toBe(13);
  });
  it('corners add posts', () => {
    expect(fenceMaterials({ ...base, corners: 2 }).posts).toBe(16);
  });
  it('concrete volume per post', () => {
    // 10″ hole, 24″ of concrete, minus a 3.5″ post
    const expected = (Math.PI * 25 * 24 - 3.5 * 3.5 * 24) / 1728;
    expect(concretePerPostCuFt(10, 30, 6, 3.5)).toBeCloseTo(expected, 10); // ≈ 0.921 ft³
    expect(expected).toBeCloseTo(0.9206, 3);
  });
  it('bag yield matches published 80 lb = 0.60 ft³, 60 lb = 0.45, 50 lb = 0.375', () => {
    expect(bagYieldCuFt(80)).toBeCloseTo(0.6, 10);
    expect(bagYieldCuFt(60)).toBeCloseTo(0.45, 10);
    expect(bagYieldCuFt(50)).toBeCloseTo(0.375, 10);
  });
  it('bags', () => {
    const r = fenceMaterials(base);
    expect(r.concreteCuFt).toBeCloseTo((14 * (Math.PI * 25 * 24 - 3.5 * 3.5 * 24)) / 1728, 10);
    expect(r.bags).toBe(Math.ceil(r.concreteCuFt / 0.6)); // 22
    expect(r.bags).toBe(22);
  });
  it('rail rule of thumb', () => {
    expect(defaultRails(4)).toBe(2);
    expect(defaultRails(6)).toBe(3);
    expect(defaultRails(8)).toBe(4);
  });
});
