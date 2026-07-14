/**
 * Cpu hatch helpers. Both return arrays of world-space polylines that a
 * scene feeds straight into StrokeSet.addStroke. Each line carries a slight
 * per-line wobble and jittered endpoints so a filled region reads as hand
 * hatching rather than a printed screen.
 *
 * hatchDisk lays parallel chords across a disk in the plane z = center.z.
 * hatchQuad fills the parallelogram corner + [0..1] uDir + [0..1] vDir and
 * assumes uDir and vDir are perpendicular (the scenes pass an orthogonal
 * basis). Both take angleRad as the hatch direction and spacing in world
 * units between lines.
 */

import * as THREE from 'three';

/* ------------------------------------------------------------------ */
/* Deterministic value noise, so the same seed draws the same hatch    */
/* ------------------------------------------------------------------ */

function hash11(n: number): number {
  const s = Math.sin(n * 127.1) * 43758.5453123;
  return s - Math.floor(s);
}

function vnoise1(x: number): number {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return hash11(i) * (1 - u) + hash11(i + 1) * u;
}

/**
 * Sample a wobbled polyline from a to b, displaced along perp. The wobble
 * envelopes to zero at both ends so the jittered endpoints stay put.
 */
function wobbleSegment(
  a: THREE.Vector3,
  b: THREE.Vector3,
  perp: THREE.Vector3,
  amp: number,
  seed: number,
): THREE.Vector3[] {
  const len = a.distanceTo(b);
  const segs = Math.max(2, Math.min(8, Math.round(len / 0.12)));
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const p = new THREE.Vector3().lerpVectors(a, b, t);
    const env = Math.sin(t * Math.PI);
    const w = (vnoise1(seed + t * 3.3) - 0.5) * 2 * amp * env;
    p.addScaledVector(perp, w);
    pts.push(p);
  }
  return pts;
}

/* ------------------------------------------------------------------ */
/* Line clip, Liang-Barsky against the world rectangle [0..W] x [0..H] */
/* ------------------------------------------------------------------ */

function clipRect(
  px: number,
  py: number,
  dx: number,
  dy: number,
  w: number,
  h: number,
): [number, number] | null {
  const p = [-dx, dx, -dy, dy];
  const q = [px, w - px, py, h - py];
  let t0 = -1e9;
  let t1 = 1e9;
  for (let i = 0; i < 4; i++) {
    if (Math.abs(p[i]) < 1e-12) {
      if (q[i] < 0) return null;
    } else {
      const r = q[i] / p[i];
      if (p[i] < 0) {
        if (r > t1) return null;
        if (r > t0) t0 = r;
      } else {
        if (r < t0) return null;
        if (r < t1) t1 = r;
      }
    }
  }
  return [t0, t1];
}

/* ------------------------------------------------------------------ */
/* Public helpers                                                      */
/* ------------------------------------------------------------------ */

export function hatchDisk(
  center: THREE.Vector3,
  radius: number,
  angleRad: number,
  spacing: number,
  seed: number,
): THREE.Vector3[][] {
  const lines: THREE.Vector3[][] = [];
  const dir = new THREE.Vector3(Math.cos(angleRad), Math.sin(angleRad), 0);
  const nrm = new THREE.Vector3(-Math.sin(angleRad), Math.cos(angleRad), 0);
  const wobbleAmp = spacing * 0.25;
  const endJit = spacing * 0.4;

  for (let off = -radius + spacing * 0.5; off < radius; off += spacing) {
    const half = Math.sqrt(Math.max(0, radius * radius - off * off));
    if (half < spacing * 0.3) continue;
    const s = seed + off * 12.9898;
    const h0 = half * (0.82 + 0.18 * hash11(s));
    const h1 = half * (0.82 + 0.18 * hash11(s + 5.1));
    const a = center.clone().addScaledVector(nrm, off).addScaledVector(dir, -h0);
    const b = center.clone().addScaledVector(nrm, off).addScaledVector(dir, h1);
    a.addScaledVector(nrm, (hash11(s + 1.0) - 0.5) * endJit);
    b.addScaledVector(nrm, (hash11(s + 2.0) - 0.5) * endJit);
    lines.push(wobbleSegment(a, b, nrm, wobbleAmp, s));
  }
  return lines;
}

export function hatchQuad(
  corner: THREE.Vector3,
  uDir: THREE.Vector3,
  vDir: THREE.Vector3,
  angleRad: number,
  spacing: number,
  seed: number,
): THREE.Vector3[][] {
  const lines: THREE.Vector3[][] = [];
  const w = uDir.length();
  const h = vDir.length();
  if (w < 1e-6 || h < 1e-6) return lines;
  const uHat = uDir.clone().multiplyScalar(1 / w);
  const vHat = vDir.clone().multiplyScalar(1 / h);

  // Work in the rectangle's world-unit frame, then map back through uHat, vHat.
  const dx = Math.cos(angleRad);
  const dy = Math.sin(angleRad);
  const nx = -dy;
  const ny = dx;
  const perp = uHat.clone().multiplyScalar(nx).addScaledVector(vHat, ny);

  const corners = [
    [0, 0],
    [w, 0],
    [0, h],
    [w, h],
  ];
  let minO = Infinity;
  let maxO = -Infinity;
  for (const [x, y] of corners) {
    const o = x * nx + y * ny;
    minO = Math.min(minO, o);
    maxO = Math.max(maxO, o);
  }

  const endJit = spacing * 0.3;
  for (let o = minO + spacing * 0.5; o < maxO; o += spacing) {
    const px = o * nx;
    const py = o * ny;
    const clip = clipRect(px, py, dx, dy, w, h);
    if (!clip) continue;
    let [t0, t1] = clip;
    if (t1 - t0 < spacing * 0.3) continue;
    const s = seed + o * 3.7;
    t0 += (hash11(s) - 0.5) * endJit;
    t1 += (hash11(s + 1.3) - 0.5) * endJit;
    const a = corner
      .clone()
      .addScaledVector(uHat, px + dx * t0)
      .addScaledVector(vHat, py + dy * t0);
    const b = corner
      .clone()
      .addScaledVector(uHat, px + dx * t1)
      .addScaledVector(vHat, py + dy * t1);
    lines.push(wobbleSegment(a, b, perp, spacing * 0.22, s));
  }
  return lines;
}
