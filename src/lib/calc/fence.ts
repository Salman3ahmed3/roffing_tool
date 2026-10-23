/**
 * Wood fence (posts, rails, pickets, concrete) for a given total run length.
 *
 *   sections = ⌈length ÷ post spacing⌉
 *   posts    = sections + 1 + corners            (a corner needs its own post)
 *   rails    = sections × rails per section
 *   pickets  = ⌈length ÷ (picket width + gap)⌉
 *   concrete per hole = π·(Ø/2)²·(hole depth − gravel) − post cross-section·(hole depth − gravel)
 *   bags     = ⌈total concrete ÷ bag yield⌉, yield = 0.0075 ft³ per lb of dry mix (0.60 ft³ per 80 lb bag)
 */
import { ceilQty } from './units';

export const CONCRETE_CUFT_PER_LB = 0.6 / 80;
export const IN3_PER_FT3 = 1728;

export interface FenceInput {
  lengthFt: number;
  postSpacingFt: number;
  railsPerSection: number;
  picketWidthIn: number;
  picketGapIn: number;
  corners: number;
  holeDiameterIn: number;
  holeDepthIn: number;
  gravelIn: number;
  /** Actual post width, e.g. 3.5″ for a nominal 4×4. */
  postWidthIn: number;
  bagLb: number;
}

export interface FenceResult {
  sections: number;
  posts: number;
  rails: number;
  pickets: number;
  concreteCuFtPerPost: number;
  concreteCuFt: number;
  bags: number;
}

/** Rule-of-thumb rail count from fence height. */
export function defaultRails(heightFt: number): number {
  if (heightFt <= 4) return 2;
  if (heightFt <= 6) return 3;
  return 4;
}

export function concretePerPostCuFt(holeDiameterIn: number, holeDepthIn: number, gravelIn: number, postWidthIn: number): number {
  const fill = Math.max(0, holeDepthIn - gravelIn);
  const hole = Math.PI * (holeDiameterIn / 2) ** 2 * fill;
  const post = postWidthIn ** 2 * fill;
  return Math.max(0, hole - post) / IN3_PER_FT3;
}

export function bagYieldCuFt(bagLb: number): number {
  return bagLb * CONCRETE_CUFT_PER_LB;
}

export function fenceMaterials(i: FenceInput): FenceResult {
  const sections = ceilQty(i.lengthFt / i.postSpacingFt);
  const posts = sections + 1 + i.corners;
  const perPost = concretePerPostCuFt(i.holeDiameterIn, i.holeDepthIn, i.gravelIn, i.postWidthIn);
  const concrete = perPost * posts;
  return {
    sections,
    posts,
    rails: sections * i.railsPerSection,
    pickets: ceilQty((i.lengthFt * 12) / (i.picketWidthIn + i.picketGapIn)),
    concreteCuFtPerPost: perPost,
    concreteCuFt: concrete,
    bags: ceilQty(concrete / bagYieldCuFt(i.bagLb)),
  };
}
