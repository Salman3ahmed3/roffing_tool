/**
 * Roofing materials (asphalt shingles) for a roof with one pitch on every plane.
 *
 *   roof area   = footprint (incl. overhangs) × rafter multiplier      [or entered directly]
 *   order area  = roof area × (1 + waste %)
 *   squares     = order area ÷ 100
 *   bundles     = ⌈squares × 3⌉                                          (3 bundles per square)
 *   underlayment rolls = ⌈order area × layers ÷ roll coverage⌉           (2 layers from 2/12 to <4/12, IRC R905.1.1)
 *   drip edge   = eaves + rakes; pieces = ⌈length ÷ (10 ft − 2″ lap)⌉  (2″ lap, IRC R905.2.8.5)
 */
import { rafterMultiplier } from './pitch';
import { ceilQty } from './units';

export type RoofShape = 'gable' | 'hip';
export type MeasureBy = 'footprint' | 'area';

export const BUNDLES_PER_SQUARE = 3;
export const SQ_FT_PER_SQUARE = 100;
export const DRIP_EDGE_PIECE_FT = 10;
export const DRIP_EDGE_LAP_IN = 2;

export const UNDERLAYMENT_OPTIONS = [
  { id: 'synthetic10', label: 'Synthetic, 10-square roll', sqft: 1000 },
  { id: 'felt15', label: '#15 felt, 4-square roll', sqft: 400 },
  { id: 'felt30', label: '#30 felt, 2-square roll', sqft: 200 },
] as const;
export type UnderlaymentId = (typeof UNDERLAYMENT_OPTIONS)[number]['id'];

export interface RoofingInput {
  measureBy: MeasureBy;
  /** Footprint length along the ridge / eaves, ft. */
  lengthFt?: number;
  /** Footprint width (gable end), ft. */
  widthFt?: number;
  /** Sloped roof area already measured, sq ft (measureBy = 'area'). */
  roofAreaSqFt?: number;
  /** Eaves + rakes, ft (measureBy = 'area'; optional). */
  edgeLengthFt?: number | null;
  /** x in x/12. */
  pitch: number;
  wastePct: number;
  shape: RoofShape;
  underlaymentSqFtPerRoll: number;
}

export type SlopeClass = 'not-allowed' | 'double-underlayment' | 'standard';

export interface RoofingResult {
  multiplier: number;
  footprintSqFt: number | null;
  roofAreaSqFt: number;
  orderAreaSqFt: number;
  squares: number;
  bundles: number;
  underlaymentLayers: 1 | 2;
  underlaymentRolls: number;
  /** null when the edge length is unknown (roof-area mode without a perimeter). */
  dripEdgeFt: number | null;
  dripEdgePieces: number | null;
  slopeClass: SlopeClass;
}

export function slopeClass(pitch: number): SlopeClass {
  if (pitch < 2) return 'not-allowed';
  if (pitch < 4) return 'double-underlayment';
  return 'standard';
}

/** Eaves + rakes for a simple rectangular roof. Gable: 2 eaves + 4 sloped rakes. Hip: eaves all round. */
export function roofEdgeLengthFt(lengthFt: number, widthFt: number, pitch: number, shape: RoofShape): number {
  if (shape === 'hip') return 2 * (lengthFt + widthFt);
  return 2 * lengthFt + 2 * widthFt * rafterMultiplier(pitch / 12);
}

export function dripEdgePieces(edgeFt: number): number {
  return ceilQty(edgeFt / (DRIP_EDGE_PIECE_FT - DRIP_EDGE_LAP_IN / 12));
}

export function roofingMaterials(i: RoofingInput): RoofingResult {
  const multiplier = rafterMultiplier(i.pitch / 12);
  let footprint: number | null = null;
  let roofArea: number;
  let edge: number | null;
  if (i.measureBy === 'footprint') {
    const L = i.lengthFt ?? 0;
    const W = i.widthFt ?? 0;
    footprint = L * W;
    roofArea = footprint * multiplier;
    edge = roofEdgeLengthFt(L, W, i.pitch, i.shape);
  } else {
    roofArea = i.roofAreaSqFt ?? 0;
    edge = i.edgeLengthFt ?? null;
  }
  const orderArea = roofArea * (1 + i.wastePct / 100);
  const squares = orderArea / SQ_FT_PER_SQUARE;
  const cls = slopeClass(i.pitch);
  const layers: 1 | 2 = cls === 'double-underlayment' ? 2 : 1;
  return {
    multiplier,
    footprintSqFt: footprint,
    roofAreaSqFt: roofArea,
    orderAreaSqFt: orderArea,
    squares,
    bundles: ceilQty(squares * BUNDLES_PER_SQUARE),
    underlaymentLayers: layers,
    underlaymentRolls: ceilQty((orderArea * layers) / i.underlaymentSqFtPerRoll),
    dripEdgeFt: edge,
    dripEdgePieces: edge === null ? null : dripEdgePieces(edge),
    slopeClass: cls,
  };
}
