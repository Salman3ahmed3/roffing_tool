import { describe, expect, it } from 'vitest';
import { deckMaterials, type DeckInput } from '../src/lib/calc/deck';

const base: DeckInput = {
  lengthFt: 16,
  depthFt: 12,
  boardWidthIn: 5.5,
  gapIn: 0.125,
  boardLengthFt: 16,
  joistSpacingIn: 16,
  wastePct: 10,
};

describe('deckMaterials', () => {
  it('16 × 12 ft deck, 16″ o.c.', () => {
    const r = deckMaterials(base);
    expect(r.areaSqFt).toBe(192);
    expect(r.rows).toBe(26); // (144 + 0.125) ÷ 5.625 = 25.62
    expect(r.deckingLinearFt).toBeCloseTo(26 * 16 * 1.1, 9);
    expect(r.boards).toBe(29); // 457.6 ÷ 16 = 28.6
    expect(r.joists).toBe(13); // 192″ ÷ 16 + 1
    expect(r.joistLengthFt).toBe(12);
    expect(r.rimJoists).toBe(2);
    expect(r.screws).toBe(26 * 13 * 2);
  });
  it('rows fit exactly when depth is a whole number of boards', () => {
    // 10 boards of 5.5″ with 9 gaps of 0.5″ = 59.5″
    const r = deckMaterials({ ...base, depthFt: 59.5 / 12, gapIn: 0.5, boardWidthIn: 5.5 });
    expect(r.rows).toBe(10);
  });
  it('12″ spacing and no waste', () => {
    const r = deckMaterials({ ...base, joistSpacingIn: 12, wastePct: 0 });
    expect(r.joists).toBe(17);
    expect(r.boards).toBe(26);
  });
});
