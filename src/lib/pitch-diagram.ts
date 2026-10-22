/** Geometry for the live roof-slope SVG (viewBox 0 0 420 230). Pure, so it is unit-tested. */

export const DIAGRAM_VIEWBOX = '0 0 420 230';

export interface TriangleGeometry {
  points: string;
  arc: string;
  valid: boolean;
  runX: number;
  runY: number;
  riseX: number;
  riseY: number;
  riseAnchor: 'start' | 'end';
  angX: number;
  angY: number;
}

const X0 = 40;
const Y0 = 190;
const MAX_W = 300;
const MAX_H = 150;
const R = 44;

const f1 = (n: number) => Math.round(n * 10) / 10;

export function triangleGeometry(ratio: number | null): TriangleGeometry {
  const valid = ratio !== null && Number.isFinite(ratio);
  // Empty / invalid state draws a neutral 6/12 outline.
  const r = valid ? (ratio as number) : 0.5;
  let w = MAX_W;
  let h = w * r;
  if (h > MAX_H) {
    h = MAX_H;
    w = h / r;
  }
  const th = Math.atan(r);
  const ex = X0 + R * Math.cos(th);
  const ey = Y0 - R * Math.sin(th);
  // Put the rise label right of the vertical edge; flip it inside when it would leave the canvas.
  const rightEdge = X0 + w;
  const outside = rightEdge + 10 <= 330;
  return {
    points: `${X0},${Y0} ${f1(X0 + w)},${Y0} ${f1(X0 + w)},${f1(Y0 - h)}`,
    arc: `M ${X0 + R} ${Y0} A ${R} ${R} 0 0 0 ${f1(ex)} ${f1(ey)}`,
    valid,
    runX: f1(X0 + w / 2),
    runY: Y0 + 26,
    riseX: outside ? f1(rightEdge + 10) : f1(rightEdge - 10),
    riseY: f1(Math.max(Y0 - h / 2 + 5, 20)),
    riseAnchor: outside ? 'start' : 'end',
    angX: X0 + R + 8,
    angY: Y0 - 10,
  };
}
