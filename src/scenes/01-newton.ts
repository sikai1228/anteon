/**
 * 01-newton (region x = 0). The proof of the whole look, drawn as an
 * engraving: mass and negative space, not a wireframe.
 *
 * A classic apple tree resolves out of the board. A heavy leaning trunk with a
 * double contour, a wide root flare and a light shade band rises into a big
 * lobed cloud of a canopy whose interior stays mostly empty; hatch patches and
 * ragged leaf hatch runs give it shaded mass, and small solid apples nest in the
 * foliage. Newton, period wig and long coat and strictly from behind, sits
 * reading against the trunk base. The hero apple condenses out of the canopy,
 * drops, bonks his head, and bounces off to the ground beside him. He reacts
 * and stands as a hand drawn flipbook, then holds the apple up and looks at it.
 *
 * Everything is built once in mount and choreographed purely as a function of
 * local scroll progress, so the scene scrubs and deep links cleanly. Seven
 * stroke sets:
 *   1. tree mass: trunk, limb bases, canopy lobes, hatch, leaf runs, apples, ground
 *   2. the hero apple, authored around its origin and carried by a group
 *   3 to 7. five flipbook poses, each its own set, hard cut by opacity
 * Plus an invisible depth occluder mesh (not a stroke set) so the frame two
 * flythrough plane hides behind the crown contour.
 *
 * Beats are written as global t, the storyboard's own numbers, remapped into
 * this scene's [0.02, 0.38] range with g2l. Tree grows 0.04 to 0.21, the apple
 * resolves 0.18 to 0.22 and falls onto his head by 0.255, bounces to rest by
 * 0.28, he rises across five poses 0.255 to 0.30 and holds the raised apple
 * from 0.30, and the whole frame holds to 0.38 while the camera tilts to sky.
 */

import * as THREE from 'three';
import type { FilmContext, FilmScene, StrokeSetApi, StrokeStyle } from '../lib/types';
import { FILM, REGIONS } from '../film.config';
import { arcPoint } from './arc';
import { blobOutline, hatchPatches, hatchQuad } from '../look/hatch';

/* ------------------------------------------------------------------ */
/* Range and remapping                                                 */
/* ------------------------------------------------------------------ */

const NEWTON_RANGE = FILM.scenes.find((s) => s.id === 'newton')?.range ?? [0.02, 0.34];
const RANGE_IN = NEWTON_RANGE[0];
const RANGE_OUT = NEWTON_RANGE[1];
const RANGE_SPAN = RANGE_OUT - RANGE_IN;

/** Global t to local 0..1 inside this scene's range. */
function g2l(g: number): number {
  return (g - RANGE_IN) / RANGE_SPAN;
}

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** A clamped 0..1 ramp between two global beats, evaluated in local space. */
function ramp(local: number, gIn: number, gOut: number): number {
  return clamp01((local - g2l(gIn)) / (g2l(gOut) - g2l(gIn)));
}

/** 1 while local sits inside the global window, else 0. Hard, for the flipbook. */
function within(local: number, gIn: number, gOut: number): number {
  return local >= g2l(gIn) && local < g2l(gOut) ? 1 : 0;
}

/** A draw window tuple, clamped into set draw space. */
function dw(a: number, b: number): [number, number] {
  return [clamp01(a), clamp01(b)];
}

/**
 * A per stroke draw window inside a named band of set draw space. t is the
 * stroke's position 0..1 within the band, w is its draw on duration.
 */
function bandWin(t: number, start: number, end: number, w: number): [number, number] {
  const c = start + clamp01(t) * (end - start);
  return dw(c, c + w);
}

/** Small deterministic prng so every rebuild draws the identical tree. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ------------------------------------------------------------------ */
/* Shared geometry helpers                                             */
/* ------------------------------------------------------------------ */

const HAND_JITTER = 0.02; // hand drawn irregularity on authored points

/** An authored polyline in local space, with hand jitter. Straight between points. */
function poly(coords: number[][], baseX: number, baseY: number, seed: number): THREE.Vector3[] {
  const rng = mulberry32(seed);
  const pts: THREE.Vector3[] = [];
  for (const c of coords) {
    pts.push(
      new THREE.Vector3(baseX + c[0] + (rng() - 0.5) * HAND_JITTER, baseY + c[1] + (rng() - 0.5) * HAND_JITTER, (rng() - 0.5) * 0.02),
    );
  }
  return pts;
}

function catmullRom(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}

/**
 * A smooth catmull rom curve through the control points, so the figures read
 * as confident strokes rather than sharp polygons. Falls back to a jittered
 * polyline when there are too few points to spline.
 */
function curve(coords: number[][], baseX: number, baseY: number, seed: number, subdiv: number): THREE.Vector3[] {
  const rng = mulberry32(seed);
  const n = coords.length;
  const j = HAND_JITTER * 0.5;
  if (n < 3) return poly(coords, baseX, baseY, seed);
  const out: THREE.Vector3[] = [];
  for (let i = 0; i < n - 1; i++) {
    const p0 = coords[Math.max(0, i - 1)];
    const p1 = coords[i];
    const p2 = coords[i + 1];
    const p3 = coords[Math.min(n - 1, i + 2)];
    for (let s = 0; s < subdiv; s++) {
      const t = s / subdiv;
      out.push(
        new THREE.Vector3(
          baseX + catmullRom(p0[0], p1[0], p2[0], p3[0], t) + (rng() - 0.5) * j,
          baseY + catmullRom(p0[1], p1[1], p2[1], p3[1], t) + (rng() - 0.5) * j,
          (rng() - 0.5) * 0.015,
        ),
      );
    }
  }
  const last = coords[n - 1];
  out.push(new THREE.Vector3(baseX + last[0] + (rng() - 0.5) * j, baseY + last[1] + (rng() - 0.5) * j, (rng() - 0.5) * 0.015));
  return out;
}

/** An inward spiral that fills its disk, so an apple reads as a solid mass. */
function spiral(cx: number, cy: number, r: number, turns: number, seed: number): THREE.Vector3[] {
  const rng = mulberry32(seed);
  const steps = Math.max(14, Math.round(turns * 13));
  const a0 = rng() * Math.PI * 2;
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const ang = a0 + t * turns * Math.PI * 2;
    const rr = r * (1 - t) * (0.9 + 0.1 * rng());
    pts.push(new THREE.Vector3(cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr, 0));
  }
  return pts;
}

/** Stretch a contour horizontally about a center, to make a lobe wider than tall. */
function stretchX(pts: THREE.Vector3[], cx: number, f: number): THREE.Vector3[] {
  for (let i = 0; i < pts.length; i++) pts[i].x = cx + (pts[i].x - cx) * f;
  return pts;
}

/* ------------------------------------------------------------------ */
/* Beats (global t, remapped through g2l)                              */
/* ------------------------------------------------------------------ */

const TREE_SET_IN = 0.04; // the trunk starts drawing under the departing quote, no dead black
const TREE_SET_OUT = 0.21; // tree mass fully drawn, then it holds

const APPLE_DRAW_IN = 0.18; // the hero apple resolves out of the foliage
const APPLE_DRAW_OUT = 0.22;
const FALL_IN = 0.22; // it lets go and falls along the arc
const HEAD_HIT = 0.255; // it bonks the crown of his head
const BOUNCE_OUT = 0.27; // it lands on the ground beside him
const HOP_OUT = 0.28; // a tiny second hop settles
const APPLE_HIDE_IN = 0.3; // the loose apple un draws as the raised apple appears
const APPLE_HIDE_OUT = 0.305;

// flipbook pose windows: each pose is hard cut on for its span
const FIGURE_IN = 0.21; // pose 1 appears, seated reading
const P2_IN = 0.255; // startled, head ducked, hand up
const P3_IN = 0.27; // rising, knees bent, hand on the ground
const P4_IN = 0.285; // standing, bent over, reaching for the apple
const P5_IN = 0.3; // upright, holding the apple raised, holds to 0.34

// draw window bands inside the tree mass set, in the order the drawing is made
const TRUNK_BAND: [number, number] = [0.0, 0.2];
const CANOPY_BAND: [number, number] = [0.4, 0.64];
const HATCH_BAND: [number, number] = [0.58, 0.84];
const LEAF_BAND: [number, number] = [0.62, 0.92];
const SCATTER_APPLE_BAND: [number, number] = [0.86, 1.0];

/* ------------------------------------------------------------------ */
/* Stroke styles (one style per set, widths overridden per stroke)     */
/* ------------------------------------------------------------------ */

const TREE_STYLE: Partial<StrokeStyle> = { widthPx: 2.6, wobbleAmp: 0.03, wobbleFreq: 1.6, dust: true, seed: 11 };
const APPLE_STYLE: Partial<StrokeStyle> = { widthPx: 2.2, wobbleAmp: 0.04, wobbleFreq: 2.0, dust: true, seed: 23 };
const FIG_STYLE: Partial<StrokeStyle> = { widthPx: 2.5, wobbleAmp: 0.05, wobbleFreq: 1.5, dust: true, seed: 37 };

/* ------------------------------------------------------------------ */
/* Trunk: heavy double contour, wide root flare, bark, shade, knots    */
/* ------------------------------------------------------------------ */

const TRUNK_SEED = 2201;
const TRUNK_TOP_X = 0.4; // the trunk leans this far right by the crown
const TRUNK_TOP_Y = 4.6; // where the trunk enters the canopy
const TRUNK_HALF_BASE = 0.42; // half width at the root, heavier than before
const TRUNK_HALF_TOP = 0.1; // half width where it enters the canopy
const TRUNK_CONTOUR_W = 4.4; // heavy chalk edge in css px
const ROOT_FLARE_W = 3.8;
const BARK_W = 1.5;
const TRUNK_SHADE_W = 1.0; // faint hatch shade down one side
const KNOT_W = 1.8;

function trunkCx(u: number): number {
  return TRUNK_TOP_X * u * u; // a gentle lean that grows toward the crown
}

function buildTrunk(set: StrokeSetApi, angle: number): void {
  const rng = mulberry32(TRUNK_SEED);
  const N = 22;
  const left: THREE.Vector3[] = [];
  const right: THREE.Vector3[] = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const cx = trunkCx(u);
    const cy = TRUNK_TOP_Y * u;
    const hw = lerp(TRUNK_HALF_BASE, TRUNK_HALF_TOP, u);
    left.push(new THREE.Vector3(cx - hw + (rng() - 0.5) * 0.03, cy, (rng() - 0.5) * 0.04));
    right.push(new THREE.Vector3(cx + hw + (rng() - 0.5) * 0.03, cy, (rng() - 0.5) * 0.04));
  }
  set.addStroke(left, { widthPx: TRUNK_CONTOUR_W, drawWindow: bandWin(0.0, TRUNK_BAND[0], TRUNK_BAND[1], 0.14) });
  set.addStroke(right, { widthPx: TRUNK_CONTOUR_W, drawWindow: bandWin(0.06, TRUNK_BAND[0], TRUNK_BAND[1], 0.14) });

  // the contours fork into heavy limb bases that continue up into the lobes and
  // terminate inside the mass, so bark flows into crown as one body. These stay
  // drawn as part of the tree mass and held.
  const limbs: number[][][] = [
    [[0.26, 4.5], [-0.05, 4.95], [-0.6, 5.45], [-0.95, 5.85]], // left fork, outer edge
    [[0.42, 4.55], [0.18, 4.95], [-0.3, 5.4], [-0.62, 5.8]], // left fork, inner edge
    [[0.4, 4.55], [0.62, 4.95], [1.0, 5.45], [1.22, 5.85]], // right fork, inner edge
    [[0.54, 4.5], [0.85, 4.95], [1.3, 5.45], [1.52, 5.9]], // right fork, outer edge
    [[0.4, 4.55], [0.36, 5.0], [0.32, 5.5]], // short middle limb into the low lobe
  ];
  for (let i = 0; i < limbs.length; i++) {
    set.addStroke(curve(limbs[i], 0, 0, TRUNK_SEED + 70 + i, 4), {
      widthPx: i === 4 ? 2.8 : 3.3,
      drawWindow: bandWin(0.55 + i * 0.06, TRUNK_BAND[0], TRUNK_BAND[1], 0.16),
    });
  }

  // a wide, heavy root flare, the right side reaching toward the seated figure
  const flares: number[][][] = [
    [[-TRUNK_HALF_BASE + 0.02, 0.6], [-0.5, 0.26], [-0.9, 0.02]],
    [[-TRUNK_HALF_BASE, 0.4], [-0.32, 0.14], [-0.58, 0.0]],
    [[-TRUNK_HALF_BASE + 0.06, 0.26], [-0.18, 0.1], [-0.34, 0.0]],
    [[TRUNK_HALF_BASE - 0.02, 0.6], [0.55, 0.26], [0.95, 0.02]],
    [[TRUNK_HALF_BASE, 0.4], [0.36, 0.14], [0.66, 0.0]],
    [[TRUNK_HALF_BASE - 0.06, 0.26], [0.2, 0.1], [0.4, 0.0]],
    [[0.0, 0.22], [0.05, 0.09], [0.12, 0.0]],
  ];
  for (let i = 0; i < flares.length; i++) {
    set.addStroke(curve(flares[i], 0, 0, TRUNK_SEED + 10 + i, 4), {
      widthPx: ROOT_FLARE_W,
      drawWindow: bandWin(0.02 + i * 0.015, TRUNK_BAND[0], TRUNK_BAND[1], 0.13),
    });
  }

  // a light hatch shade band inside the left half of the trunk, at the film
  // angle, each short stroke kept strictly between the two contours
  const shadeBoil = TRUNK_SEED + 60;
  const shadeN = 12;
  const sdx = Math.cos(angle);
  const sdy = Math.sin(angle);
  for (let i = 0; i < shadeN; i++) {
    const u = 0.08 + (i / (shadeN - 1)) * 0.72;
    const cx = trunkCx(u);
    const cy = TRUNK_TOP_Y * u;
    const hw = lerp(TRUNK_HALF_BASE, TRUNK_HALF_TOP, u);
    const mx = cx - hw * 0.42;
    const half = hw * 0.4;
    set.addStroke(
      [new THREE.Vector3(mx - sdx * half, cy - sdy * half, -0.02), new THREE.Vector3(mx + sdx * half, cy + sdy * half, -0.02)],
      { widthPx: TRUNK_SHADE_W, boilSeed: shadeBoil, drawWindow: bandWin(0.4 + (i / shadeN) * 0.5, TRUNK_BAND[0], TRUNK_BAND[1], 0.12) },
    );
  }

  // short bark ticks kept well inside the contours, their own near-vertical way
  const bark = 18;
  for (let i = 0; i < bark; i++) {
    const u = 0.1 + rng() * 0.72;
    const cx = trunkCx(u);
    const cy = TRUNK_TOP_Y * u;
    const hw = lerp(TRUNK_HALF_BASE, TRUNK_HALF_TOP, u);
    const bx = cx + (rng() - 0.5) * hw * 0.9;
    const h = 0.1 + rng() * 0.16;
    const tick = [
      new THREE.Vector3(bx, cy - h * 0.5, 0.02),
      new THREE.Vector3(bx + (rng() - 0.5) * 0.05, cy + h * 0.5, 0.02),
    ];
    set.addStroke(tick, { widthPx: BARK_W, drawWindow: bandWin(0.05 + (i % 7) * 0.02, TRUNK_BAND[0], TRUNK_BAND[1], 0.12) });
  }

  // knot hints as tight little spirals, well inside the contours
  set.addStroke(spiral(trunkCx(0.4) + 0.03, TRUNK_TOP_Y * 0.4, 0.1, 2, TRUNK_SEED + 40), {
    widthPx: KNOT_W,
    drawWindow: bandWin(0.1, TRUNK_BAND[0], TRUNK_BAND[1], 0.12),
  });
  set.addStroke(spiral(trunkCx(0.66) - 0.04, TRUNK_TOP_Y * 0.66, 0.08, 2, TRUNK_SEED + 41), {
    widthPx: KNOT_W,
    drawWindow: bandWin(0.13, TRUNK_BAND[0], TRUNK_BAND[1], 0.12),
  });
}

/* ------------------------------------------------------------------ */
/* Canopy: lobed cloud, empty inside, hatch patches and leaf runs      */
/* ------------------------------------------------------------------ */

const CANOPY_OUTLINE_W = 2.4;
const CANOPY_HATCH_W = 2.2; // shading patches, midtone not flooded
const CANOPY_LEAF_W = 1.8; // the ragged leaf hatch runs
const CANOPY_XSTRETCH = 1.25; // wider than tall

/** Overlapping closed lobes. The middle one is centered on the apple start. */
const CANOPY_LOBES: { c: [number, number]; r: number; lobes: number; seed: number }[] = [
  { c: [-1.5, 6.2], r: 1.6, lobes: 7, seed: 301 },
  { c: [1.5, 6.25], r: 1.7, lobes: 8, seed: 302 },
  { c: [0.3, 5.4], r: 1.55, lobes: 7, seed: 303 }, // low lobe overlaps the trunk top
];

/**
 * Directional shading patches, low and inside each lobe, all at the film's one
 * hatch angle. The board above stays bare shadow; this is the midtone mass held
 * to about a third of the crown, not flooding it. Each center is a lobe
 * underside and hatchPatches biases further down from there.
 */
const CANOPY_HATCH: { c: [number, number]; r: number; count: number; pr: number; sp: number; seed: number }[] = [
  { c: [-1.5, 5.4], r: 1.3, count: 3, pr: 0.44, sp: 0.16, seed: 311 },
  { c: [1.5, 5.5], r: 1.4, count: 3, pr: 0.46, sp: 0.16, seed: 312 },
  { c: [0.3, 5.0], r: 1.2, count: 3, pr: 0.44, sp: 0.15, seed: 313 },
  { c: [-0.4, 5.9], r: 1.1, count: 3, pr: 0.42, sp: 0.16, seed: 314 },
];

/**
 * Leaf cluster runs, now short parallel hatch at the film angle instead of
 * zigzag scribble, per the style brief (no scribble for tone). The leaf-cluster
 * energy comes from ragged grouping, and every clump sits low and inside the
 * lobes, off the top rim.
 */
const CANOPY_LEAVES: { c: [number, number]; n: number; len: number; sp: number; seed: number }[] = [
  { c: [-1.8, 5.5], n: 5, len: 0.34, sp: 0.14, seed: 351 },
  { c: [-1.1, 5.15], n: 4, len: 0.3, sp: 0.14, seed: 352 },
  { c: [-0.5, 5.6], n: 5, len: 0.32, sp: 0.14, seed: 353 },
  { c: [0.1, 5.05], n: 4, len: 0.3, sp: 0.13, seed: 354 },
  { c: [0.7, 5.5], n: 6, len: 0.34, sp: 0.14, seed: 355 },
  { c: [1.3, 5.15], n: 4, len: 0.3, sp: 0.13, seed: 356 },
  { c: [1.9, 5.5], n: 5, len: 0.32, sp: 0.14, seed: 357 },
  { c: [-0.9, 4.85], n: 3, len: 0.28, sp: 0.13, seed: 358 },
  { c: [0.9, 4.8], n: 4, len: 0.3, sp: 0.13, seed: 359 },
  { c: [-2.1, 5.15], n: 3, len: 0.28, sp: 0.13, seed: 360 },
];

/** A ragged clump of short parallel strokes at the given angle, one leaf cluster. */
function hatchRun(cx: number, cy: number, count: number, len: number, spacing: number, angle: number, seed: number): THREE.Vector3[][] {
  const rng = mulberry32(seed);
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const nx = -dy;
  const ny = dx;
  const out: THREE.Vector3[][] = [];
  for (let i = 0; i < count; i++) {
    const off = (i - (count - 1) / 2) * spacing + (rng() - 0.5) * spacing * 0.5;
    const l = len * (0.6 + 0.6 * rng());
    const mx = cx + nx * off + (rng() - 0.5) * 0.1;
    const my = cy + ny * off + (rng() - 0.5) * 0.1;
    out.push([
      new THREE.Vector3(mx - dx * l * 0.5, my - dy * l * 0.5, 0),
      new THREE.Vector3(mx + dx * l * 0.5, my + dy * l * 0.5, 0),
    ]);
  }
  return out;
}

function buildCanopy(set: StrokeSetApi, angle: number): void {
  // the scallop contours, the only thing that draws the crown silhouette
  for (let i = 0; i < CANOPY_LOBES.length; i++) {
    const lo = CANOPY_LOBES[i];
    const center = new THREE.Vector3(lo.c[0], lo.c[1], 0);
    const pts = stretchX(blobOutline(center, lo.r, lo.lobes, lo.seed), lo.c[0], CANOPY_XSTRETCH);
    const t = CANOPY_LOBES.length > 1 ? i / (CANOPY_LOBES.length - 1) : 0;
    set.addStroke(pts, { widthPx: CANOPY_OUTLINE_W, drawWindow: bandWin(t, CANOPY_BAND[0], CANOPY_BAND[1], 0.18) });
  }

  // shading patches at the one hatch angle, each cluster re-registering as a unit
  const clusters: { lines: THREE.Vector3[][]; ci: number }[] = [];
  let total = 0;
  for (let ci = 0; ci < CANOPY_HATCH.length; ci++) {
    const p = CANOPY_HATCH[ci];
    const lines = hatchPatches(new THREE.Vector3(p.c[0], p.c[1], 0), p.r, p.count, p.pr, p.sp, p.seed, angle);
    clusters.push({ lines, ci });
    total += lines.length;
  }
  const hn = Math.max(1, total - 1);
  let gi = 0;
  for (const cl of clusters) {
    for (const line of cl.lines) {
      set.addStroke(line, { widthPx: CANOPY_HATCH_W, boilSeed: 600 + cl.ci, drawWindow: bandWin(gi / hn, HATCH_BAND[0], HATCH_BAND[1], 0.14) });
      gi++;
    }
  }

  // ragged leaf hatch runs, low and inside, each clump boiling as one unit
  const ln = Math.max(1, CANOPY_LEAVES.length - 1);
  for (let i = 0; i < CANOPY_LEAVES.length; i++) {
    const lf = CANOPY_LEAVES[i];
    const runs = hatchRun(lf.c[0], lf.c[1], lf.n, lf.len, lf.sp, angle, lf.seed);
    for (const r of runs) set.addStroke(r, { widthPx: CANOPY_LEAF_W, boilSeed: 700 + i, drawWindow: bandWin(i / ln, LEAF_BAND[0], LEAF_BAND[1], 0.16) });
  }
}

/* ------------------------------------------------------------------ */
/* Apples: solid spirals nested in the foliage, plus the hero apple    */
/* ------------------------------------------------------------------ */

const APPLE_FILL_W = 2.0;
const APPLE_STEM_W = 1.5;
const APPLE_SEED = 909;
const APPLE_R = 0.22;

const SCATTER_APPLES: { c: [number, number]; r: number; seed: number }[] = [
  { c: [-1.4, 5.6], r: 0.2, seed: 331 },
  { c: [0.6, 6.4], r: 0.18, seed: 332 },
  { c: [2.0, 6.0], r: 0.21, seed: 333 },
  { c: [-0.4, 5.0], r: 0.19, seed: 334 },
  { c: [1.1, 5.4], r: 0.2, seed: 335 },
  { c: [-2.1, 6.2], r: 0.17, seed: 336 },
  { c: [2.6, 5.6], r: 0.19, seed: 337 },
];

function buildScatterApples(set: StrokeSetApi): void {
  const n = Math.max(1, SCATTER_APPLES.length - 1);
  for (let i = 0; i < SCATTER_APPLES.length; i++) {
    const ap = SCATTER_APPLES[i];
    set.addStroke(spiral(ap.c[0], ap.c[1], ap.r, 3, ap.seed), {
      widthPx: APPLE_FILL_W,
      drawWindow: bandWin(i / n, SCATTER_APPLE_BAND[0], SCATTER_APPLE_BAND[1], 0.1),
    });
  }
}

function buildHeroApple(set: StrokeSetApi): void {
  // a solid spiral matching the scattered apples, plus a stem, around origin
  set.addStroke(spiral(0, 0, APPLE_R, 3, APPLE_SEED), { widthPx: APPLE_FILL_W, drawWindow: dw(0.0, 0.72) });
  const stem = [
    new THREE.Vector3(0.02, APPLE_R * 0.9, 0),
    new THREE.Vector3(0.05, APPLE_R * 1.25, 0),
    new THREE.Vector3(0.03, APPLE_R * 1.5, 0),
  ];
  set.addStroke(stem, { widthPx: APPLE_STEM_W, drawWindow: dw(0.6, 1.0) });
}

// the fall onto the head, then a scene authored bounce to the ground beside him
const HEAD_X = FILM.arc.end[0];
const HEAD_Y = FILM.arc.end[1];
const LAND_X = 1.55;
const LAND_Y = 0.1;
const BOUNCE_CX = HEAD_X + 0.65; // control point of the bounce parabola
const BOUNCE_CY = HEAD_Y + 1.48; // apex sits about 0.5 up and 0.4 right of his head
const HOP_H = 0.15; // height of the tiny second hop
const SQUASH_AMT = 0.34; // vertical squash fraction at the bonk
const BONK_WIN = 0.012; // squash window widths in global t, all brief
const LAND_WIN = 0.01;
const HOP_WIN = 0.008;

/** A brief raised cosine squash pulse centered on a contact, pure in local. */
function pulseAt(local: number, gCenter: number, gWidth: number): number {
  const d = (local - g2l(gCenter)) / (gWidth / RANGE_SPAN);
  if (d <= -1 || d >= 1) return 0;
  return Math.cos(d * Math.PI * 0.5);
}

/* ------------------------------------------------------------------ */
/* Figure: period Newton from behind, five flipbook poses              */
/* ------------------------------------------------------------------ */

const FIG_X = 0.75; // world x of the figure, at the trunk base
const FIG_WIDTH = 2.7; // wider so the figure holds against the trunk's weight
const WIG_W = 2.8; // the wig curls read a touch heavier
const POSE_SUBDIV = 5; // catmull samples per control segment

interface Pose {
  /** Count of leading strokes that are wig curls, drawn a touch heavier. */
  wig: number;
  /** Master-sketch curves: about eight long connected lines, wig curls first. */
  strokes: number[][][];
  /** The raised apple in pose five, local x, y, radius. */
  held?: [number, number, number];
}

// pose one: seated reading, leaning on the trunk. The wig crown is pinned to
// arc.end ([0.85, 1.12] world) so the apple bonks it; nothing rises above y1.12
const POSE1: Pose = {
  wig: 2,
  strokes: [
    [[-0.04, 0.98], [-0.02, 1.1], [0.1, 1.12], [0.2, 1.08], [0.24, 0.96]], // wig dome over the crown
    [[-0.02, 0.94], [0.1, 0.9], [0.22, 0.94]], // nested wig curl at the nape
    [[0.1, 1.1], [0.02, 0.88], [-0.03, 0.64], [0.02, 0.44], [0.1, 0.33]], // crown down the back to the seat
    [[-0.08, 0.82], [0.08, 0.66], [0.28, 0.56], [0.42, 0.52]], // near arm sweeping to the book
    [[0.26, 0.82], [0.36, 0.64], [0.42, 0.54]], // far arm to the book
    [[-0.12, 0.34], [0.14, 0.28], [0.4, 0.32], [0.56, 0.4]], // coat skirt on the ground
    [[0.14, 0.34], [0.54, 0.28], [0.96, 0.15], [1.22, 0.08]], // near leg extended into the ground
    [[0.18, 0.3], [0.54, 0.2], [0.9, 0.11], [1.08, 0.06]], // far leg
  ],
};

// pose two: startled, head ducked, one arm thrown up over the bonk
const POSE2: Pose = {
  wig: 2,
  strokes: [
    [[-0.06, 0.86], [-0.04, 0.97], [0.06, 0.99], [0.16, 0.96], [0.2, 0.85]], // wig dome, ducked
    [[-0.04, 0.82], [0.06, 0.78], [0.16, 0.82]], // nested wig curl
    [[0.06, 0.96], [-0.01, 0.78], [-0.05, 0.56], [0.0, 0.4], [0.08, 0.3]], // crown down the hunched back
    [[0.18, 0.74], [0.3, 1.02], [0.26, 1.32], [0.15, 1.5]], // one bold arm thrown up over the head
    [[-0.1, 0.72], [-0.2, 0.48], [-0.26, 0.28]], // other arm bracing down
    [[-0.14, 0.3], [0.1, 0.24], [0.36, 0.28], [0.54, 0.34]], // coat skirt
    [[0.12, 0.32], [0.46, 0.26], [0.82, 0.15], [1.02, 0.1]], // near leg pulling in
    [[0.16, 0.28], [0.46, 0.18], [0.78, 0.11], [0.95, 0.07]], // far leg
  ],
};

// pose three: rising, knees bent, one hand planted on the ground
const POSE3: Pose = {
  wig: 2,
  strokes: [
    [[0.06, 1.48], [0.08, 1.59], [0.18, 1.61], [0.28, 1.58], [0.32, 1.46]], // wig dome
    [[0.08, 1.44], [0.18, 1.4], [0.28, 1.44]], // nested wig curl
    [[0.18, 1.58], [0.12, 1.4], [0.06, 1.1], [0.05, 0.82], [0.07, 0.58]], // crown down the pitched-forward back
    [[0.03, 1.3], [-0.1, 0.9], [-0.2, 0.42], [-0.26, 0.08]], // one arm planted on the ground
    [[0.34, 1.3], [0.44, 0.98], [0.46, 0.7]], // other arm pushing off the knee
    [[-0.06, 0.58], [0.12, 0.48], [0.3, 0.52], [0.42, 0.6]], // coat skirt
    [[0.1, 0.58], [0.42, 0.68], [0.54, 0.42], [0.47, 0.08]], // near leg, knee up, into the ground
    [[0.16, 0.54], [0.4, 0.58], [0.5, 0.36], [0.45, 0.06]], // far leg
  ],
};

// pose four: standing, bent from the waist, reaching for the apple at [1.55, 0.1]
const POSE4: Pose = {
  wig: 2,
  strokes: [
    [[0.3, 1.66], [0.32, 1.77], [0.42, 1.79], [0.52, 1.76], [0.56, 1.64]], // wig dome, head forward
    [[0.32, 1.6], [0.42, 1.56], [0.52, 1.6]], // nested wig curl
    [[0.42, 1.76], [0.34, 1.48], [0.2, 1.18], [0.1, 0.98], [0.05, 0.82]], // crown down the bent back
    [[0.5, 1.5], [0.64, 1.05], [0.74, 0.55], [0.8, 0.12]], // reaching arm all the way to the apple
    [[0.22, 1.5], [0.09, 1.15], [-0.02, 0.86]], // trailing arm as counterweight
    [[-0.02, 0.82], [0.16, 0.7], [0.36, 0.74], [0.48, 0.84]], // coat skirt swinging forward
    [[0.05, 0.82], [0.03, 0.44], [0.02, 0.06]], // near leg into the ground
    [[0.22, 0.82], [0.24, 0.44], [0.26, 0.06]], // far leg
  ],
};

// pose five: upright, the apple raised clear above the wig, held to 0.38. He
// stands about 15 percent taller here (crown near y2.82) than the earlier build
const POSE5: Pose = {
  wig: 2,
  held: [0.66, 3.12, 0.16],
  strokes: [
    [[-0.1, 2.68], [-0.06, 2.8], [0.06, 2.82], [0.18, 2.79], [0.22, 2.66]], // wig dome at the crown
    [[-0.08, 2.62], [0.06, 2.58], [0.2, 2.62]], // nested wig curl
    [[0.06, 2.78], [0.03, 2.3], [0.01, 1.8], [0.0, 1.35], [0.0, 1.0]], // crown straight down the back
    [[0.24, 2.52], [0.48, 2.66], [0.6, 2.92], [0.64, 3.04]], // raised arm, elbow high, up to the apple
    [[-0.24, 2.5], [-0.3, 2.0], [-0.3, 1.5]], // other arm at his side
    [[-0.26, 2.45], [-0.32, 1.7], [-0.34, 1.08], [0.0, 1.0], [0.34, 1.08]], // coat left side sweeping to the hem
    [[-0.1, 1.0], [-0.12, 0.5], [-0.14, 0.06]], // near leg into the ground
    [[0.12, 1.0], [0.13, 0.5], [0.14, 0.06]], // far leg
  ],
};

const POSES: Pose[] = [POSE1, POSE2, POSE3, POSE4, POSE5];
const POSE_SEED_BASE = 4100;

function buildPose(set: StrokeSetApi, pose: Pose, seed: number): void {
  for (let i = 0; i < pose.strokes.length; i++) {
    const w = i < pose.wig ? WIG_W : FIG_WIDTH;
    set.addStroke(curve(pose.strokes[i], FIG_X, 0, seed + i + 1, POSE_SUBDIV), { widthPx: w, drawWindow: dw(0, 1) });
  }
  if (pose.held) {
    set.addStroke(spiral(FIG_X + pose.held[0], pose.held[1], pose.held[2], 3, seed + 500), { widthPx: APPLE_FILL_W, drawWindow: dw(0, 1) });
  }
  set.setDraw(1); // poses are fully drawn, the flipbook cuts them with opacity
}

/* ------------------------------------------------------------------ */
/* Ground: a hatched band at the film angle, plus a horizon             */
/* ------------------------------------------------------------------ */

const GROUND_SEED = 7007;
const GROUND_X0 = -14; // the band spans the full visible ground at the frame 1 framings
const GROUND_X1 = 16;
const GROUND_Y_LO = -0.45;
const GROUND_Y_HI = 0.35;
const GROUND_HATCH_SPACING = 0.28;
const GROUND_HATCH_W = 1.2;
const GROUND_BAND: [number, number] = [0.0, 0.16]; // ground draws early with the trunk
const HORIZON_X0 = -15;
const HORIZON_X1 = 17;
const HORIZON_Y = 0.25;
const HORIZON_W = 1.8;

function buildGround(set: StrokeSetApi, angle: number): void {
  // one hatched ground band at the film angle, boiling as a single unit
  const corner = new THREE.Vector3(GROUND_X0, GROUND_Y_LO, 0);
  const uDir = new THREE.Vector3(GROUND_X1 - GROUND_X0, 0, 0);
  const vDir = new THREE.Vector3(0, GROUND_Y_HI - GROUND_Y_LO, 0);
  const band = hatchQuad(corner, uDir, vDir, angle, GROUND_HATCH_SPACING, GROUND_SEED);
  const bn = Math.max(1, band.length - 1);
  for (let i = 0; i < band.length; i++) {
    set.addStroke(band[i], { widthPx: GROUND_HATCH_W, boilSeed: GROUND_SEED, drawWindow: bandWin(i / bn, GROUND_BAND[0], GROUND_BAND[1], 0.08) });
  }

  // a single faint horizon further back, the only other mark on the ground
  const rng = mulberry32(GROUND_SEED + 1);
  const horizon: THREE.Vector3[] = [];
  const steps = 40;
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    horizon.push(new THREE.Vector3(lerp(HORIZON_X0, HORIZON_X1, u), HORIZON_Y + (rng() - 0.5) * 0.08, -1.0));
  }
  set.addStroke(horizon, { widthPx: HORIZON_W, drawWindow: dw(0.0, 0.08) });
}

/* ------------------------------------------------------------------ */
/* Depth occluder: an invisible solid of the tree, for the flythrough  */
/* ------------------------------------------------------------------ */

// The flythrough plane depth-tests against this. It writes only depth, in the
// opaque pass, so the plane is hidden behind the tree's silhouette and its lines
// stop at the crown contour. None of the tree's own stroke sets depth-test, so
// they draw exactly as before.
const OCCLUDER_ON = 0.2; // gate it on once the canopy is complete

let occluder: THREE.Group;
let occluderMat: THREE.MeshBasicMaterial;

function buildOccluder(): THREE.Group {
  occluderMat = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: true, depthTest: true });
  const g = new THREE.Group();

  // one filled shape per canopy lobe, the same outline the contour draws
  for (const lo of CANOPY_LOBES) {
    const pts = stretchX(blobOutline(new THREE.Vector3(lo.c[0], lo.c[1], 0), lo.r, lo.lobes, lo.seed), lo.c[0], CANOPY_XSTRETCH);
    const shape = new THREE.Shape();
    shape.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i].x, pts[i].y);
    shape.closePath();
    g.add(new THREE.Mesh(new THREE.ShapeGeometry(shape), occluderMat));
  }

  // the trunk band, closed across the flared base
  const trunk = new THREE.Shape();
  const steps = 16;
  trunk.moveTo(-0.9, 0);
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    trunk.lineTo(trunkCx(u) - lerp(TRUNK_HALF_BASE, TRUNK_HALF_TOP, u), TRUNK_TOP_Y * u);
  }
  for (let i = steps; i >= 0; i--) {
    const u = i / steps;
    trunk.lineTo(trunkCx(u) + lerp(TRUNK_HALF_BASE, TRUNK_HALF_TOP, u), TRUNK_TOP_Y * u);
  }
  trunk.lineTo(0.95, 0);
  trunk.closePath();
  g.add(new THREE.Mesh(new THREE.ShapeGeometry(trunk), occluderMat));

  return g;
}

/* ------------------------------------------------------------------ */
/* Scene                                                               */
/* ------------------------------------------------------------------ */

// preallocated scratch, so update never allocates
const _p = new THREE.Vector3();

let root: THREE.Group;
let appleGroup: THREE.Group;
let treeSet: StrokeSetApi;
let appleSet: StrokeSetApi;
let poseSets: StrokeSetApi[] = [];
let allSets: StrokeSetApi[] = [];
let mounted = false;

/** The apple trajectory: fall along the arc, bonk, bounce, hop, rest. */
function updateApple(local: number): void {
  if (local < g2l(HEAD_HIT)) {
    const sf = ramp(local, FALL_IN, HEAD_HIT);
    arcPoint(sf * sf, _p);
  } else if (local < g2l(BOUNCE_OUT)) {
    const u = ramp(local, HEAD_HIT, BOUNCE_OUT);
    const v = 1 - u;
    _p.set(v * v * HEAD_X + 2 * v * u * BOUNCE_CX + u * u * LAND_X, v * v * HEAD_Y + 2 * v * u * BOUNCE_CY + u * u * LAND_Y, 0);
  } else if (local < g2l(HOP_OUT)) {
    const u = ramp(local, BOUNCE_OUT, HOP_OUT);
    _p.set(LAND_X, LAND_Y + HOP_H * 4 * u * (1 - u), 0);
  } else {
    _p.set(LAND_X, LAND_Y, 0);
  }

  const sq = SQUASH_AMT * pulseAt(local, HEAD_HIT, BONK_WIN) + 0.22 * pulseAt(local, BOUNCE_OUT, LAND_WIN) + 0.14 * pulseAt(local, HOP_OUT, HOP_WIN);
  appleGroup.position.set(_p.x, _p.y - APPLE_R * sq * 0.5, 0);
  // tumble accumulates through the fall and gains a kick off the bonk
  const spin = ramp(local, FALL_IN, HEAD_HIT) * 0.4 + ramp(local, HEAD_HIT, BOUNCE_OUT) * 1.1 + ramp(local, BOUNCE_OUT, HOP_OUT) * 0.4;
  appleGroup.rotation.z = -spin;
  appleGroup.scale.set(1 + sq * 0.7, 1 - sq, 1);
}

export const newtonScene: FilmScene = {
  id: 'newton',

  mount(ctx: FilmContext) {
    if (mounted) return;
    mounted = true;

    root = new THREE.Group();
    root.position.x = REGIONS.newton;
    appleGroup = new THREE.Group();

    treeSet = ctx.makeStrokeSet({ style: TREE_STYLE, maxPoints: 9000 });
    appleSet = ctx.makeStrokeSet({ style: APPLE_STYLE, maxPoints: 300 });
    poseSets = POSES.map(() => ctx.makeStrokeSet({ style: FIG_STYLE, maxPoints: 800 }));

    const hatchAngle = ctx.look.hatchAngleRad;
    buildTrunk(treeSet, hatchAngle);
    buildCanopy(treeSet, hatchAngle);
    buildScatterApples(treeSet);
    buildGround(treeSet, hatchAngle);
    buildHeroApple(appleSet);
    for (let i = 0; i < POSES.length; i++) buildPose(poseSets[i], POSES[i], POSE_SEED_BASE + i * 100);

    root.add(treeSet.object3d);
    appleGroup.add(appleSet.object3d);
    root.add(appleGroup);
    for (const p of poseSets) root.add(p.object3d);

    occluder = buildOccluder();
    occluder.visible = false; // gated on in update once the canopy is complete
    root.add(occluder);

    treeSet.setOpacity(1);
    appleSet.setOpacity(1);
    for (const p of poseSets) p.setOpacity(0); // hidden until their flipbook frame

    allSets = [treeSet, appleSet, ...poseSets];
    ctx.three.scene.add(root);
  },

  update(local: number, _global: number, ctx: FilmContext) {
    if (!mounted) return;

    // the tree mass draws and holds
    treeSet.setDraw(ramp(local, TREE_SET_IN, TREE_SET_OUT));
    // the hero apple resolves out of the foliage, then un draws as he lifts it
    appleSet.setDraw(ramp(local, APPLE_DRAW_IN, APPLE_DRAW_OUT) * (1 - ramp(local, APPLE_HIDE_IN, APPLE_HIDE_OUT)));
    updateApple(local);

    // the flipbook: exactly one pose is opaque at a time, hard cuts, no fades
    poseSets[0].setOpacity(within(local, FIGURE_IN, P2_IN));
    poseSets[1].setOpacity(within(local, P2_IN, P3_IN));
    poseSets[2].setOpacity(within(local, P3_IN, P4_IN));
    poseSets[3].setOpacity(within(local, P4_IN, P5_IN));
    poseSets[4].setOpacity(local >= g2l(P5_IN) ? 1 : 0);

    // the depth occluder is on once the canopy is complete, hiding the flythrough
    // plane where it slides behind the crown
    occluder.visible = local >= g2l(OCCLUDER_ON);

    // one update per set per frame keeps the boil and the px widths correct
    const time = ctx.time();
    const cam = ctx.three.camera;
    const vp = ctx.viewport();
    for (const s of allSets) s.update(time, cam, vp);
  },

  setVisible(v: boolean) {
    if (mounted) root.visible = v;
  },

  dispose() {
    if (!mounted) return;
    for (const s of allSets) s.dispose();
    occluder.traverse((o) => {
      if (o instanceof THREE.Mesh) o.geometry.dispose();
    });
    occluderMat.dispose();
    root.removeFromParent();
    mounted = false;
  },
};
