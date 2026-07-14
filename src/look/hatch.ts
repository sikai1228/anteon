/**
 * Cpu sketch helpers. They return world-space polylines (or arrays of them) in
 * the plane z = center.z, which a scene feeds straight into
 * StrokeSet.addStroke. Everything is deterministic per seed.
 *
 * Fill helpers, returning many lines:
 * - hatchDisk lays parallel chords across a disk.
 * - hatchQuad fills the parallelogram corner + [0..1] uDir + [0..1] vDir and
 *   assumes uDir and vDir are perpendicular (the scenes pass an orthogonal
 *   basis).
 * - hatchPatches scatters small hatch disks inside a blob, denser underneath.
 * The hatch fills take angleRad as the hatch direction and spacing in world
 * units between lines, and carry a slight per-line wobble with jittered
 * endpoints so a region reads as hand hatching rather than a printed screen.
 *
 * Shape helpers, returning one polyline:
 * - scribbleLine zigzags along an axis, a fast leaf-cluster scribble.
 * - blobOutline is a closed lobed cloud contour for canopy silhouettes.
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

/* ------------------------------------------------------------------ */
/* Sketch-mass helpers for the Newton canopy rebuild                    */
/* ------------------------------------------------------------------ */

/**
 * One polyline that zigzags along the a to b axis, like a fast scribble filling
 * a leaf cluster. Cycle length and amplitude are jittered; the ends anchor at
 * a and b. Lateral motion stays in the z = a.z plane.
 */
export function scribbleLine(
  a: THREE.Vector3,
  b: THREE.Vector3,
  amplitude: number,
  cycles: number,
  seed: number,
): THREE.Vector3[] {
  const axis = b.clone().sub(a);
  const len = axis.length();
  if (len < 1e-6) return [a.clone(), b.clone()];
  const dir = axis.multiplyScalar(1 / len);
  const perp = new THREE.Vector3(-dir.y, dir.x, 0);
  if (perp.lengthSq() < 1e-9) perp.set(1, 0, 0);
  else perp.normalize();

  const steps = Math.max(6, Math.round(cycles * 4));
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const env = Math.sin(t * Math.PI); // zero at both ends, so a and b stay put
    const warp = 1 + (vnoise1(seed + t * (cycles + 1) * 1.7) - 0.5) * 0.6;
    const phase = t * cycles * Math.PI * 2 * warp;
    const amp = amplitude * (0.55 + 0.9 * hash11(seed + i * 2.3));
    const lateral = Math.sin(phase) * amp * env;
    const along = (hash11(seed + i * 5.1) - 0.5) * (len / steps) * 0.5 * env;
    pts.push(a.clone().addScaledVector(dir, t * len + along).addScaledVector(perp, lateral));
  }
  return pts;
}

/**
 * A closed lobed cloud contour for a canopy silhouette. Each lobe is an outward
 * cosine arc with a rounded crest, and each notch between lobes is a soft inward
 * curve, never a sharp vertex. A slow phase wobble and a slow additive term give
 * uneven, hand-drawn lobes without sharpening the valleys. It is sampled under
 * three degrees per segment, so there are no straight runs. Scallop depth falls
 * off as the lobe count rises, since a small blob cannot carry many deep lobes
 * without pinching the valleys into points; the radius stays within about 0.6 to
 * 1.2 of the given radius, deepest at low lobe counts. Returns one polyline with
 * the last point equal to the first, deterministic per seed.
 */
export function blobOutline(
  center: THREE.Vector3,
  radius: number,
  lobes: number,
  seed: number,
): THREE.Vector3[] {
  const l = Math.max(1, Math.round(lobes));
  // Under three degrees per segment, at least twenty points per lobe, so crests
  // and valleys resolve as smooth arcs rather than straight runs meeting at points.
  const n = Math.max(120, l * 20);
  // Scallop depth shrinks as the lobes multiply: a small blob cannot carry many
  // deep lobes without pinching the valleys, so cap the depth and let it fall off
  // with the count to keep every notch a soft rounded curve.
  const depth = Math.min(0.2, 1.1 / l);
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= n; i++) {
    const ang = (i / n) * Math.PI * 2;
    // The main scallop is a single cosine, so the crest and valley are both
    // rounded. A slow phase wobble makes the lobe spacing uneven and a slow
    // additive term makes some lobes taller, so it reads hand-drawn without the
    // high-frequency sidebands that would sharpen the valleys.
    const phase = seed + 0.35 * Math.sin(ang + seed * 0.7);
    const main = depth * Math.cos(l * ang + phase);
    const slow = 0.045 * Math.cos(2 * ang + seed * 1.3) + 0.028 * Math.cos(3 * ang + seed * 2.1);
    const r = radius * (0.9 + main + slow);
    pts.push(new THREE.Vector3(center.x + Math.cos(ang) * r, center.y + Math.sin(ang) * r, center.z));
  }
  pts[pts.length - 1] = pts[0].clone();
  return pts;
}

/**
 * Several small disks of parallel hatching scattered inside a blob of the given
 * radius. Placement and density bias toward the underside (negative y side of
 * center), where the shaded mass of a canopy sits. If angleRad is given, every
 * patch hatches in that direction with only a small jitter, which is what the
 * single-direction hatch style wants; if it is omitted, each patch takes its own
 * random angle, the original behavior. Returns the flattened set of hatch lines.
 */
export function hatchPatches(
  center: THREE.Vector3,
  radius: number,
  patchCount: number,
  patchRadius: number,
  spacing: number,
  seed: number,
  angleRad?: number,
): THREE.Vector3[][] {
  const out: THREE.Vector3[][] = [];
  const count = Math.max(1, Math.round(patchCount));
  const span = Math.max(radius, 1e-6);
  for (let k = 0; k < count; k++) {
    const s = seed + k * 7.13;
    const ang = hash11(s) * Math.PI * 2;
    const rr = Math.sqrt(hash11(s + 1.3)) * Math.max(0, radius - patchRadius);
    const bias = hash11(s + 2.1) * radius * 0.35;
    const cx = center.x + Math.cos(ang) * rr;
    const cy = center.y + Math.sin(ang) * rr - bias;
    const under = Math.min(1, Math.max(0, (center.y - cy) / span));
    const sp = spacing * (1 - 0.4 * under);
    const pr = patchRadius * (0.7 + 0.5 * hash11(s + 4.2)) * (1 + 0.3 * under);
    const patchAngle =
      angleRad === undefined
        ? hash11(s + 3.7) * Math.PI
        : angleRad + (hash11(s + 3.7) - 0.5) * 0.1;
    const c = new THREE.Vector3(cx, cy, center.z);
    const lines = hatchDisk(c, pr, patchAngle, sp, s + 9.0);
    for (let i = 0; i < lines.length; i++) out.push(lines[i]);
  }
  return out;
}
