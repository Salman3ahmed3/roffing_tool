/**
 * Rectangular deck surface and framing.
 *
 *   rows of boards = ⌈(depth + gap) ÷ (board width + gap)⌉        (boards run along the length)
 *   decking        = ⌈rows × length × (1 + waste %) ÷ board length⌉
 *   joists         = ⌈length ÷ joist spacing⌉ + 1, each as long as the depth
 *   rim joists     = 2, each as long as the length
 *   screws         = rows × joists × 2                             (2 per board at every joist)
 */
import { ceilQty } from './units';

export const SCREWS_PER_CROSSING = 2;

export interface DeckInput {
  /** Along the house; boards run this way. ft */
  lengthFt: number;
  /** Out from the house; joists run this way. ft */
  depthFt: number;
  boardWidthIn: number;
  gapIn: number;
  boardLengthFt: number;
  joistSpacingIn: number;
  wastePct: number;
}

export interface DeckResult {
  areaSqFt: number;
  rows: number;
  deckingLinearFt: number;
  boards: number;
  joists: number;
  joistLengthFt: number;
  rimJoists: number;
  rimLengthFt: number;
  screws: number;
}

export function deckMaterials(i: DeckInput): DeckResult {
  const rows = ceilQty((i.depthFt * 12 + i.gapIn) / (i.boardWidthIn + i.gapIn));
  const linear = rows * i.lengthFt * (1 + i.wastePct / 100);
  const joists = ceilQty((i.lengthFt * 12) / i.joistSpacingIn) + 1;
  return {
    areaSqFt: i.lengthFt * i.depthFt,
    rows,
    deckingLinearFt: linear,
    boards: ceilQty(linear / i.boardLengthFt),
    joists,
    joistLengthFt: i.depthFt,
    rimJoists: 2,
    rimLengthFt: i.lengthFt,
    screws: rows * joists * SCREWS_PER_CROSSING,
  };
}
