import { describe, expect, it } from 'vitest';
import { dripEdgePieces, roofEdgeLengthFt, roofingMaterials, slopeClass, type RoofingInput } from '../src/lib/calc/roofing';

const base: RoofingInput = {
  measureBy: 'footprint',
  lengthFt: 40,
  widthFt: 30,
  pitch: 6,
  wastePct: 10,
  shape: 'gable',
  underlaymentSqFtPerRoll: 1000,
};

describe('roofingMaterials', () => {
  it('40 × 30 ft, 6/12, 10% waste (design example)', () => {
    const r = roofingMaterials(base);
    expect(r.footprintSqFt).toBe(1200);
    expect(r.roofAreaSqFt).toBeCloseTo(1200 * Math.sqrt(1.25), 9); // 1341.64
    expect(r.orderAreaSqFt).toBeCloseTo(1475.8, 1);
    expect(r.squares).toBeCloseTo(14.758, 3);
    expect(r.bundles).toBe(45); // ⌈44.27⌉
    expect(r.underlaymentLayers).toBe(1);
    expect(r.underlaymentRolls).toBe(2);
    expect(r.dripEdgeFt).toBeCloseTo(80 + 60 * Math.sqrt(1.25), 9); // 147.08
    expect(r.dripEdgePieces).toBe(15);
  });
  it('flat footprint at 0/12 equals roof area', () => {
    const r = roofingMaterials({ ...base, pitch: 0, wastePct: 0 });
    expect(r.roofAreaSqFt).toBe(1200);
    expect(r.squares).toBe(12);
    expect(r.bundles).toBe(36);
    expect(r.slopeClass).toBe('not-allowed');
  });
  it('whole squares do not round up from float noise', () => {
    // 1000 sq ft exactly → 10 squares → 30 bundles
    const r = roofingMaterials({ ...base, measureBy: 'area', roofAreaSqFt: 1000, wastePct: 0 });
    expect(r.bundles).toBe(30);
    expect(r.underlaymentRolls).toBe(1);
    expect(r.dripEdgeFt).toBeNull();
    expect(r.dripEdgePieces).toBeNull();
  });
  it('low slope doubles underlayment', () => {
    const r = roofingMaterials({ ...base, pitch: 3, underlaymentSqFtPerRoll: 400 });
    expect(r.underlaymentLayers).toBe(2);
    expect(r.underlaymentRolls).toBe(Math.ceil((r.orderAreaSqFt * 2) / 400));
  });
  it('hip roof edges are eaves all round', () => {
    expect(roofEdgeLengthFt(40, 30, 6, 'hip')).toBe(140);
    const r = roofingMaterials({ ...base, shape: 'hip' });
    expect(r.dripEdgePieces).toBe(Math.ceil(140 / (10 - 2 / 12)));
    // same pitch on every plane → same area as gable
    expect(r.roofAreaSqFt).toBeCloseTo(roofingMaterials(base).roofAreaSqFt, 9);
  });
  it('drip edge pieces account for the 2″ lap', () => {
    expect(dripEdgePieces(9.8)).toBe(1);
    expect(dripEdgePieces(10)).toBe(2);
    expect(dripEdgePieces(59)).toBe(6); // 6 × 9.833 = 59.0
  });
  it('slope classes', () => {
    expect(slopeClass(1.99)).toBe('not-allowed');
    expect(slopeClass(2)).toBe('double-underlayment');
    expect(slopeClass(3.99)).toBe('double-underlayment');
    expect(slopeClass(4)).toBe('standard');
  });
});
