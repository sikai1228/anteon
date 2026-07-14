/**
 * 01-newton (region x = 0). The proof of the whole look, drawn as an
 * engraving: mass and negative space, not a wireframe.
 *
 * A classic apple tree resolves out of the board. A heavy leaning trunk with a
 * double contour, a wide root flare and a light shade band rises into a big
 * lobed cloud of a canopy whose interior stays mostly empty; hatch patches and
 * loose leaf scribbles give it shaded mass, and small solid apples nest in the
 * foliage. Newton, period wig and long coat and strictly from behind, sits
 * reading against the trunk base. The hero apple condenses out of the canopy,
 * drops, bonks his head, and bounces off to the ground beside him. He reacts
 * and stands as a hand drawn flipbook, then holds the apple up and looks at it.
 *
 * Everything is built once in mount and choreographed purely as a function of
 * local scroll progress, so the scene scrubs and deep links cleanly. Eight
 * stroke sets:
 *   1. tree mass: trunk, canopy lobes, hatch, scribbles, nested apples, ground
 *   2. branch scaffold: draws during growth then un draws as the canopy takes
 *      over, so the finished crown carries no wiry branches
 *   3. the hero apple, authored around its origin and carried by a group
 *   4 to 8. five flipbook poses, each its own set, hard cut by opacity
 *
 * Beats are written as global t, the storyboard's own numbers, remapped into
 * this scene's [0.02, 0.34] range with g2l. Tree grows 0.04 to 0.21, the apple
 * resolves 0.18 to 0.22 and falls onto his head by 0.255, bounces to rest by
 * 0.28, he rises across five poses 0.255 to 0.30 and holds the raised apple
 * from 0.30, and the whole frame holds to 0.34 while the camera tilts to sky.
 */

import * as THREE from 'three';
import type { FilmContext, FilmScene, StrokeSetApi, StrokeStyle } from '../lib/types';
import { FILM, REGIONS } from '../film.config';
import { arcPoint } from './arc';
import { blobOutline, hatchPatches, hatchQuad, scribbleLine } from '../look/hatch';

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

/** A wobbly closed ring, used for the figure heads. */
function ring(cx: number, cy: number, r: number, seed: number, segs: number): THREE.Vector3[] {
  const rng = mulberry32(seed);
  const start = rng() * Math.PI * 2;
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= segs; i++) {
    const ang = start + (i / segs) * Math.PI * 2;
    const rr = r * (1 + (rng() - 0.5) * 0.14);
    pts.push(new THREE.Vector3(cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr, 0));
  }
  return pts;
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

// the branch scaffold draws during growth then un draws as the canopy takes over
const SCAFFOLD_IN = 0.05;
const SCAFFOLD_DRAWN = 0.15;
const SCAFFOLD_OUT_IN = 0.16;
const SCAFFOLD_OUT_OUT = 0.19;

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
const SCRIBBLE_BAND: [number, number] = [0.62, 0.92];
const SCATTER_APPLE_BAND: [number, number] = [0.86, 1.0];
// the branch scaffold occupies this much of its own set draw space, root first
const SCAFFOLD_BAND: [number, number] = [0.0, 0.85];

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

function buildTrunk(set: StrokeSetApi): void {
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

  // a light hatch shade band down the left of the trunk
  const shade = hatchQuad(
    new THREE.Vector3(-TRUNK_HALF_BASE, 0.2, -0.02),
    new THREE.Vector3(0.3, 0, 0),
    new THREE.Vector3(0, 3.4, 0),
    1.2,
    0.16,
    TRUNK_SEED + 60,
  );
  const shn = Math.max(1, shade.length - 1);
  for (let i = 0; i < shade.length; i++) {
    set.addStroke(shade[i], { widthPx: TRUNK_SHADE_W, drawWindow: bandWin(0.4 + (i / shn) * 0.5, TRUNK_BAND[0], TRUNK_BAND[1], 0.12) });
  }

  // short curved bark ticks between the contours
  const bark = 18;
  for (let i = 0; i < bark; i++) {
    const u = 0.1 + rng() * 0.72;
    const cx = trunkCx(u);
    const cy = TRUNK_TOP_Y * u;
    const hw = lerp(TRUNK_HALF_BASE, TRUNK_HALF_TOP, u);
    const bx = cx + (rng() - 0.5) * hw * 1.1;
    const h = 0.14 + rng() * 0.22;
    const tick = [
      new THREE.Vector3(bx, cy - h * 0.5, 0.02),
      new THREE.Vector3(bx + (rng() - 0.5) * 0.06, cy + h * 0.5, 0.02),
    ];
    set.addStroke(tick, { widthPx: BARK_W, drawWindow: bandWin(0.05 + (i % 7) * 0.02, TRUNK_BAND[0], TRUNK_BAND[1], 0.12) });
  }

  // one or two knot hints as tight little spirals
  set.addStroke(spiral(trunkCx(0.4) + 0.03, TRUNK_TOP_Y * 0.4, 0.12, 2, TRUNK_SEED + 40), {
    widthPx: KNOT_W,
    drawWindow: bandWin(0.1, TRUNK_BAND[0], TRUNK_BAND[1], 0.12),
  });
  set.addStroke(spiral(trunkCx(0.66) - 0.05, TRUNK_TOP_Y * 0.66, 0.09, 2, TRUNK_SEED + 41), {
    widthPx: KNOT_W,
    drawWindow: bandWin(0.13, TRUNK_BAND[0], TRUNK_BAND[1], 0.12),
  });
}

/* ------------------------------------------------------------------ */
/* Branch scaffold: draws during growth, then un draws                 */
/* ------------------------------------------------------------------ */

const BRANCH_SEED = 1337;
const BRANCH_MAX_DEPTH = 4;
const BRANCH_ROOT_LEN = 1.7;
const LENGTH_FALLOFF = 0.75;
const BRANCH_SPREAD = 0.9;
const BRANCH_JITTER = 0.4;
const THREE_CHILD_CHANCE = 0.4;
const TWIG_COUNT = 3;
const TWIG_SPREAD = 1.2;
const BRANCH_SEGS = 6;
const BRANCH_CURVE = 0.14;
const BRANCH_WOBBLE_AMP = 0.06;
const BRANCH_WOBBLE_FREQ = 1.7;
const BRANCH_Z_JITTER = 0.16;
const BRANCH_BASE_W = 2.6;
const BRANCH_TIP_W = 0.9;
const BRANCH_MAX_STROKES = 200;
const ORDER_JITTER = 0.85;

interface Branch {
  pts: THREE.Vector3[];
  widthPx: number;
  /** Growth order 0..1, base at 0 and outer twigs near 1. */
  order: number;
}

function growBranch(
  sx: number,
  sy: number,
  sz: number,
  angle: number,
  length: number,
  depth: number,
  rng: () => number,
  out: Branch[],
): void {
  if (out.length >= BRANCH_MAX_STROKES) return;
  const segs = Math.max(3, BRANCH_SEGS - depth);
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const px = -dy;
  const py = dx;
  const phase = rng() * Math.PI * 2;
  const bow = (rng() - 0.5) * 2 * BRANCH_CURVE;
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= segs; i++) {
    const u = i / segs;
    const along = u * length;
    const bend = Math.sin(u * Math.PI) * bow * length;
    const wob = Math.sin(u * BRANCH_WOBBLE_FREQ * Math.PI + phase) * BRANCH_WOBBLE_AMP * length * (0.35 + 0.65 * u);
    const off = bend + wob;
    pts.push(
      new THREE.Vector3(sx + dx * along + px * off, sy + dy * along + py * off, sz + (rng() - 0.5) * BRANCH_Z_JITTER * u),
    );
  }
  const widthPx = lerp(BRANCH_BASE_W, BRANCH_TIP_W, depth / BRANCH_MAX_DEPTH);
  const order = (depth + rng() * ORDER_JITTER) / (BRANCH_MAX_DEPTH + 1);
  out.push({ pts, widthPx, order });
  if (depth >= BRANCH_MAX_DEPTH) return;

  const tip = pts[pts.length - 1];
  if (depth === BRANCH_MAX_DEPTH - 1) {
    for (let k = 0; k < TWIG_COUNT; k++) {
      const frac = TWIG_COUNT > 1 ? k / (TWIG_COUNT - 1) - 0.5 : 0;
      const a = angle + frac * TWIG_SPREAD + (rng() - 0.5) * BRANCH_JITTER;
      growBranch(tip.x, tip.y, tip.z, a, length * LENGTH_FALLOFF * 0.8, depth + 1, rng, out);
    }
    return;
  }

  const n = rng() < THREE_CHILD_CHANCE ? 3 : 2;
  for (let c = 0; c < n; c++) {
    const frac = n > 1 ? c / (n - 1) - 0.5 : 0;
    const a = angle + frac * BRANCH_SPREAD + (rng() - 0.5) * BRANCH_JITTER;
    const l = length * LENGTH_FALLOFF * (0.85 + 0.3 * rng());
    growBranch(tip.x, tip.y, tip.z, a, l, depth + 1, rng, out);
  }
}

function buildScaffold(set: StrokeSetApi): void {
  const branches: Branch[] = [];
  growBranch(TRUNK_TOP_X, TRUNK_TOP_Y, 0, Math.PI / 2 - 0.12, BRANCH_ROOT_LEN, 0, mulberry32(BRANCH_SEED), branches);
  branches.sort((a, b) => a.order - b.order);
  for (const b of branches) {
    set.addStroke(b.pts, { widthPx: b.widthPx, drawWindow: bandWin(b.order, SCAFFOLD_BAND[0], SCAFFOLD_BAND[1], 0.18) });
  }
}

/* ------------------------------------------------------------------ */
/* Canopy: lobed cloud, empty inside, hatch patches and leaf scribbles */
/* ------------------------------------------------------------------ */

const CANOPY_OUTLINE_W = 2.4;
const CANOPY_HATCH_W = 2.4;
const CANOPY_SCRIBBLE_W = 2.2;
const CANOPY_XSTRETCH = 1.25; // wider than tall

/** Overlapping closed lobes. The middle one is centered on the apple start. */
const CANOPY_LOBES: { c: [number, number]; r: number; lobes: number; seed: number }[] = [
  { c: [-1.5, 6.2], r: 1.6, lobes: 7, seed: 301 },
  { c: [1.5, 6.25], r: 1.7, lobes: 8, seed: 302 },
  { c: [0.3, 5.8], r: 1.5, lobes: 7, seed: 303 },
];

/**
 * Directional hatch clustered low and inside each lobe. Denser than before,
 * around a third of the crown, so it reads as shaded mass with the interior
 * still mostly negative space. Each center sits at a lobe underside and
 * hatchPatches biases further down from there.
 */
const CANOPY_HATCH: { c: [number, number]; r: number; count: number; pr: number; sp: number; seed: number }[] = [
  { c: [-1.5, 5.4], r: 1.3, count: 4, pr: 0.44, sp: 0.16, seed: 311 },
  { c: [1.5, 5.5], r: 1.4, count: 4, pr: 0.46, sp: 0.16, seed: 312 },
  { c: [0.3, 5.0], r: 1.2, count: 4, pr: 0.44, sp: 0.15, seed: 313 },
  { c: [-0.4, 5.9], r: 1.1, count: 4, pr: 0.42, sp: 0.16, seed: 314 },
];

/** Loose leaf cluster runs, along the lobe interiors as well as the edges. */
const CANOPY_SCRIBBLES: { a: [number, number]; b: [number, number]; amp: number; cyc: number; seed: number }[] = [
  { a: [-2.7, 6.0], b: [-2.0, 5.6], amp: 0.14, cyc: 5, seed: 321 },
  { a: [-0.8, 7.0], b: [-0.2, 7.1], amp: 0.12, cyc: 6, seed: 322 },
  { a: [2.6, 6.4], b: [3.2, 6.1], amp: 0.14, cyc: 5, seed: 323 },
  { a: [0.9, 4.6], b: [1.6, 4.7], amp: 0.12, cyc: 6, seed: 324 },
  { a: [-1.8, 4.7], b: [-1.1, 4.6], amp: 0.13, cyc: 5, seed: 325 },
  { a: [0.4, 7.2], b: [1.0, 7.0], amp: 0.12, cyc: 6, seed: 326 },
  { a: [2.1, 5.0], b: [2.7, 5.2], amp: 0.13, cyc: 5, seed: 327 },
  { a: [-3.0, 5.5], b: [-2.4, 5.6], amp: 0.12, cyc: 5, seed: 328 },
  { a: [-1.9, 5.9], b: [-1.2, 5.7], amp: 0.13, cyc: 6, seed: 329 },
  { a: [1.1, 5.9], b: [1.8, 5.8], amp: 0.13, cyc: 6, seed: 330 },
  { a: [-0.2, 5.2], b: [0.6, 5.3], amp: 0.12, cyc: 5, seed: 340 },
  { a: [0.7, 5.6], b: [1.3, 5.5], amp: 0.12, cyc: 6, seed: 341 },
  { a: [-0.9, 6.4], b: [-0.3, 6.5], amp: 0.13, cyc: 6, seed: 342 },
  { a: [1.7, 6.6], b: [2.3, 6.5], amp: 0.12, cyc: 5, seed: 343 },
  { a: [-2.2, 6.5], b: [-1.6, 6.4], amp: 0.12, cyc: 6, seed: 344 },
];

function buildCanopy(set: StrokeSetApi): void {
  for (let i = 0; i < CANOPY_LOBES.length; i++) {
    const lo = CANOPY_LOBES[i];
    const center = new THREE.Vector3(lo.c[0], lo.c[1], 0);
    const pts = stretchX(blobOutline(center, lo.r, lo.lobes, lo.seed), lo.c[0], CANOPY_XSTRETCH);
    const t = CANOPY_LOBES.length > 1 ? i / (CANOPY_LOBES.length - 1) : 0;
    set.addStroke(pts, { widthPx: CANOPY_OUTLINE_W, drawWindow: bandWin(t, CANOPY_BAND[0], CANOPY_BAND[1], 0.18) });
  }

  const patchLines: THREE.Vector3[][] = [];
  for (const p of CANOPY_HATCH) {
    const lines = hatchPatches(new THREE.Vector3(p.c[0], p.c[1], 0), p.r, p.count, p.pr, p.sp, p.seed);
    for (let i = 0; i < lines.length; i++) patchLines.push(lines[i]);
  }
  const hn = Math.max(1, patchLines.length - 1);
  for (let i = 0; i < patchLines.length; i++) {
    set.addStroke(patchLines[i], { widthPx: CANOPY_HATCH_W, drawWindow: bandWin(i / hn, HATCH_BAND[0], HATCH_BAND[1], 0.14) });
  }

  const sn = Math.max(1, CANOPY_SCRIBBLES.length - 1);
  for (let i = 0; i < CANOPY_SCRIBBLES.length; i++) {
    const s = CANOPY_SCRIBBLES[i];
    const line = scribbleLine(new THREE.Vector3(s.a[0], s.a[1], 0), new THREE.Vector3(s.b[0], s.b[1], 0), s.amp, s.cyc, s.seed);
    set.addStroke(line, { widthPx: CANOPY_SCRIBBLE_W, drawWindow: bandWin(i / sn, SCRIBBLE_BAND[0], SCRIBBLE_BAND[1], 0.16) });
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
const FIG_WIDTH = 2.5;
const WIG_W = 2.8; // the wig mass reads a touch heavier
const POSE_SUBDIV = 5; // catmull samples per control segment

interface Pose {
  /** Head circle in local space: x offset, y, radius. */
  head: [number, number, number];
  strokes: number[][][];
  /** The raised apple in pose five, local x, y, radius. */
  held?: [number, number, number];
}

// pose one: seated reading, leaning on the trunk, head crown pinned to arc.end
// ([0.85, 1.12] world, so head center is [0.10, 0.95] local at FIG_X 0.75)
const POSE1: Pose = {
  head: [0.1, 0.95, 0.17],
  strokes: [
    [[-0.1, 1.08], [-0.15, 0.95], [-0.08, 0.85]], // left wig curl
    [[0.28, 1.06], [0.33, 0.93], [0.25, 0.84]], // right wig curl
    [[-0.05, 0.86], [0.1, 0.82], [0.26, 0.86]], // wig at the nape
    [[0.02, 0.82], [-0.04, 0.62], [-0.01, 0.42], [0.06, 0.3]], // coat back, leaning on the trunk
    [[-0.12, 0.8], [0.1, 0.86], [0.3, 0.82]], // broad coat shoulders
    [[0.04, 0.6], [0.06, 0.42], [0.08, 0.3]], // coat vent
    [[-0.14, 0.32], [0.08, 0.26], [0.34, 0.3], [0.54, 0.36]], // coat skirt on the ground
    [[-0.1, 0.78], [0.04, 0.6], [0.22, 0.5]], // left arm holding a book
    [[0.28, 0.78], [0.36, 0.6], [0.26, 0.5]], // right arm holding a book
    [[0.16, 0.5], [0.34, 0.52], [0.46, 0.48]], // the book on his lap
    [[0.14, 0.3], [0.54, 0.26], [0.94, 0.14], [1.16, 0.08]], // near leg extended
    [[0.18, 0.28], [0.54, 0.18], [0.89, 0.1], [1.06, 0.06]], // far leg
    [[1.16, 0.08], [1.32, 0.06]], // near foot
    [[1.06, 0.06], [1.22, 0.045]], // far foot
  ],
};

// pose two: startled, head ducked, one hand thrown up over the bonk
const POSE2: Pose = {
  head: [0.07, 0.82, 0.17],
  strokes: [
    [[-0.12, 0.94], [-0.17, 0.82], [-0.1, 0.73]], // left wig curl
    [[0.24, 0.93], [0.29, 0.8], [0.21, 0.72]], // right wig curl
    [[-0.08, 0.73], [0.07, 0.7], [0.22, 0.74]], // wig at the nape
    [[0.0, 0.7], [-0.06, 0.52], [-0.02, 0.36], [0.06, 0.28]], // coat back, hunched
    [[-0.16, 0.72], [0.06, 0.8], [0.28, 0.74]], // shoulders shrugged up
    [[0.04, 0.52], [0.06, 0.38], [0.08, 0.28]], // coat vent
    [[-0.16, 0.3], [0.08, 0.24], [0.34, 0.28], [0.54, 0.34]], // coat skirt
    [[0.26, 0.74], [0.32, 1.0], [0.24, 1.28], [0.16, 1.44]], // right arm up over his head
    [[-0.12, 0.7], [-0.2, 0.45], [-0.24, 0.24]], // left arm bracing
    [[0.14, 0.28], [0.49, 0.24], [0.84, 0.16], [1.04, 0.1]], // near leg pulling in
    [[0.18, 0.26], [0.49, 0.16], [0.79, 0.1], [0.96, 0.07]], // far leg
    [[1.04, 0.1], [1.19, 0.08]], // near foot
    [[0.96, 0.07], [1.1, 0.05]], // far foot
    [[0.39, 0.16], [0.56, 0.12]], // the dropped book
  ],
};

// pose three: rising, knees bent, one hand planted on the ground
const POSE3: Pose = {
  head: [0.18, 1.35, 0.17],
  strokes: [
    [[-0.02, 1.48], [-0.07, 1.35], [0.0, 1.25]], // left wig curl
    [[0.38, 1.46], [0.43, 1.33], [0.35, 1.24]], // right wig curl
    [[0.03, 1.25], [0.18, 1.22], [0.33, 1.26]], // wig at the nape
    [[0.15, 1.22], [0.08, 0.98], [0.03, 0.72], [0.05, 0.5]], // coat back, tipping forward
    [[-0.01, 1.2], [0.19, 1.26], [0.37, 1.18]], // shoulders
    [[0.08, 0.95], [0.07, 0.7], [0.08, 0.52]], // coat vent
    [[-0.08, 0.5], [0.09, 0.42], [0.27, 0.46], [0.43, 0.52]], // coat skirt hanging
    [[0.01, 1.15], [-0.12, 0.7], [-0.22, 0.3], [-0.26, 0.06]], // left arm planted on the ground
    [[0.35, 1.16], [0.45, 0.85], [0.43, 0.6]], // right arm pushing off the knee
    [[0.13, 0.5], [0.38, 0.62], [0.53, 0.4], [0.45, 0.08]], // near leg bent, knee up
    [[0.17, 0.48], [0.37, 0.55], [0.49, 0.35], [0.43, 0.06]], // far leg bent
    [[0.45, 0.08], [0.63, 0.06]], // near foot
    [[0.43, 0.06], [0.59, 0.045]], // far foot
    [[-0.26, 0.06], [-0.16, 0.05]], // the planted hand
  ],
};

// pose four: standing, bent from the waist, reaching for the apple at [1.55, 0.1]
const POSE4: Pose = {
  head: [0.38, 1.6, 0.17],
  strokes: [
    [[0.18, 1.72], [0.13, 1.6], [0.2, 1.5]], // left wig curl
    [[0.56, 1.7], [0.61, 1.57], [0.53, 1.48]], // right wig curl
    [[0.22, 1.5], [0.37, 1.47], [0.52, 1.5]], // wig at the nape
    [[0.32, 1.47], [0.24, 1.2], [0.14, 0.98], [0.08, 0.85]], // coat back, bent forward
    [[0.18, 1.46], [0.36, 1.5], [0.52, 1.42]], // shoulders
    [[0.16, 1.15], [0.1, 0.95], [0.08, 0.82]], // coat vent
    [[-0.04, 0.82], [0.12, 0.72], [0.3, 0.76], [0.44, 0.84]], // coat skirt swinging forward
    [[0.46, 1.44], [0.6, 1.0], [0.7, 0.5], [0.8, 0.12]], // reaching arm down to the apple
    [[0.2, 1.44], [0.07, 1.1], [-0.03, 0.85]], // trailing arm as counterweight
    [[0.02, 0.8], [0.02, 0.45], [0.02, 0.06]], // left leg
    [[0.2, 0.8], [0.22, 0.45], [0.24, 0.06]], // right leg
    [[0.02, 0.06], [-0.1, 0.03]], // left shoe
    [[0.24, 0.06], [0.36, 0.03]], // right shoe
  ],
};

// pose five: upright, holding the apple raised, looking at it, held to 0.34
const POSE5: Pose = {
  head: [0.06, 2.28, 0.17],
  held: [0.5, 2.32, 0.15],
  strokes: [
    [[-0.12, 2.4], [-0.17, 2.27], [-0.1, 2.17]], // left wig curl
    [[0.26, 2.4], [0.31, 2.27], [0.22, 2.17]], // right wig curl
    [[-0.08, 2.17], [0.07, 2.14], [0.22, 2.18]], // wig at the nape
    [[0.03, 2.14], [0.01, 1.75], [0.01, 1.35], [0.0, 1.05]], // coat back, upright
    [[-0.22, 2.1], [0.05, 2.16], [0.32, 2.1]], // shoulders
    [[-0.24, 2.08], [-0.28, 1.55], [-0.32, 1.05]], // coat left side
    [[0.32, 2.08], [0.35, 1.6], [0.37, 1.1]], // coat right side
    [[-0.32, 1.05], [0.0, 0.98], [0.37, 1.05]], // coat skirt hem
    [[0.0, 1.45], [0.0, 1.1], [0.0, 0.95]], // coat vent
    [[-0.24, 2.06], [-0.3, 1.6], [-0.3, 1.2]], // left arm at his side
    [[0.28, 2.05], [0.46, 1.98], [0.48, 2.22]], // right arm raised, holding the apple
    [[-0.12, 0.95], [-0.13, 0.5], [-0.14, 0.06]], // left leg
    [[0.12, 0.95], [0.13, 0.5], [0.14, 0.06]], // right leg
    [[-0.14, 0.06], [-0.26, 0.03]], // left shoe
    [[0.14, 0.06], [0.26, 0.03]], // right shoe
  ],
};

const POSES: Pose[] = [POSE1, POSE2, POSE3, POSE4, POSE5];
const POSE_SEED_BASE = 4100;

function buildPose(set: StrokeSetApi, pose: Pose, seed: number): void {
  set.addStroke(ring(FIG_X + pose.head[0], pose.head[1], pose.head[2], seed, 18), { widthPx: WIG_W, drawWindow: dw(0, 1) });
  for (let i = 0; i < pose.strokes.length; i++) {
    set.addStroke(curve(pose.strokes[i], FIG_X, 0, seed + i + 1, POSE_SUBDIV), { widthPx: FIG_WIDTH, drawWindow: dw(0, 1) });
  }
  if (pose.held) {
    set.addStroke(spiral(FIG_X + pose.held[0], pose.held[1], pose.held[2], 3, seed + 500), { widthPx: APPLE_FILL_W, drawWindow: dw(0, 1) });
  }
  set.setDraw(1); // poses are fully drawn, the flipbook cuts them with opacity
}

/* ------------------------------------------------------------------ */
/* Ground: a hatched band, grass fans, a horizon further back          */
/* ------------------------------------------------------------------ */

const GROUND_SEED = 7007;
const GROUND_X0 = -4.5;
const GROUND_X1 = 6.5;
const GROUND_Y_LO = -0.45;
const GROUND_Y_HI = 0.35;
const GROUND_HATCH_ANGLE = 0.6;
const GROUND_HATCH_SPACING = 0.28;
const GROUND_HATCH_W = 1.2;
const GROUND_BAND: [number, number] = [0.0, 0.16]; // ground draws early with the trunk
const HORIZON_X0 = -9;
const HORIZON_X1 = 11;
const HORIZON_Y = 0.25;
const HORIZON_W = 1.8;
const GRASS_CLUSTERS = [0, FIG_X, LAND_X];
const GRASS_PER = 4;
const GRASS_SPREAD = 1.2;
const GRASS_MIN = 0.12;
const GRASS_VAR = 0.18;
const GRASS_W = 1.4;

function buildGround(set: StrokeSetApi): void {
  const corner = new THREE.Vector3(GROUND_X0, GROUND_Y_LO, 0);
  const uDir = new THREE.Vector3(GROUND_X1 - GROUND_X0, 0, 0);
  const vDir = new THREE.Vector3(0, GROUND_Y_HI - GROUND_Y_LO, 0);
  const band = hatchQuad(corner, uDir, vDir, GROUND_HATCH_ANGLE, GROUND_HATCH_SPACING, GROUND_SEED);
  const bn = Math.max(1, band.length - 1);
  for (let i = 0; i < band.length; i++) {
    set.addStroke(band[i], { widthPx: GROUND_HATCH_W, drawWindow: bandWin(i / bn, GROUND_BAND[0], GROUND_BAND[1], 0.08) });
  }

  const rng = mulberry32(GROUND_SEED + 1);
  const horizon: THREE.Vector3[] = [];
  const steps = 40;
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    horizon.push(new THREE.Vector3(lerp(HORIZON_X0, HORIZON_X1, u), HORIZON_Y + (rng() - 0.5) * 0.08, -1.0));
  }
  set.addStroke(horizon, { widthPx: HORIZON_W, drawWindow: dw(0.0, 0.08) });

  let gi = 0;
  for (const cx of GRASS_CLUSTERS) {
    for (let k = 0; k < GRASS_PER; k++) {
      const bx = cx + (rng() - 0.5) * GRASS_SPREAD;
      const h = GRASS_MIN + rng() * GRASS_VAR;
      for (let f = 0; f < 3; f++) {
        const lean = (f - 1) * 0.16 + (rng() - 0.5) * 0.08;
        const tuft = [new THREE.Vector3(bx, 0, 0.02), new THREE.Vector3(bx + lean * h, h * (0.8 + 0.3 * rng()), 0.02)];
        set.addStroke(tuft, { widthPx: GRASS_W, drawWindow: bandWin(0.02 + (gi % 5) * 0.02, GROUND_BAND[0], GROUND_BAND[1], 0.08) });
      }
      gi++;
    }
  }
}

/* ------------------------------------------------------------------ */
/* Scene                                                               */
/* ------------------------------------------------------------------ */

// preallocated scratch, so update never allocates
const _p = new THREE.Vector3();

let root: THREE.Group;
let appleGroup: THREE.Group;
let treeSet: StrokeSetApi;
let scaffoldSet: StrokeSetApi;
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
    scaffoldSet = ctx.makeStrokeSet({ style: TREE_STYLE, maxPoints: 1500 });
    appleSet = ctx.makeStrokeSet({ style: APPLE_STYLE, maxPoints: 300 });
    poseSets = POSES.map(() => ctx.makeStrokeSet({ style: FIG_STYLE, maxPoints: 800 }));

    buildTrunk(treeSet);
    buildCanopy(treeSet);
    buildScatterApples(treeSet);
    buildGround(treeSet);
    buildScaffold(scaffoldSet);
    buildHeroApple(appleSet);
    for (let i = 0; i < POSES.length; i++) buildPose(poseSets[i], POSES[i], POSE_SEED_BASE + i * 100);

    root.add(treeSet.object3d);
    root.add(scaffoldSet.object3d);
    appleGroup.add(appleSet.object3d);
    root.add(appleGroup);
    for (const p of poseSets) root.add(p.object3d);

    treeSet.setOpacity(1);
    scaffoldSet.setOpacity(1);
    appleSet.setOpacity(1);
    for (const p of poseSets) p.setOpacity(0); // hidden until their flipbook frame

    allSets = [treeSet, scaffoldSet, appleSet, ...poseSets];
    ctx.three.scene.add(root);
  },

  update(local: number, _global: number, ctx: FilmContext) {
    if (!mounted) return;

    // the tree mass draws and holds; the scaffold draws then un draws under it
    treeSet.setDraw(ramp(local, TREE_SET_IN, TREE_SET_OUT));
    scaffoldSet.setDraw(ramp(local, SCAFFOLD_IN, SCAFFOLD_DRAWN) * (1 - ramp(local, SCAFFOLD_OUT_IN, SCAFFOLD_OUT_OUT)));
    // the hero apple resolves out of the foliage, then un draws as he lifts it
    appleSet.setDraw(ramp(local, APPLE_DRAW_IN, APPLE_DRAW_OUT) * (1 - ramp(local, APPLE_HIDE_IN, APPLE_HIDE_OUT)));
    updateApple(local);

    // the flipbook: exactly one pose is opaque at a time, hard cuts, no fades
    poseSets[0].setOpacity(within(local, FIGURE_IN, P2_IN));
    poseSets[1].setOpacity(within(local, P2_IN, P3_IN));
    poseSets[2].setOpacity(within(local, P3_IN, P4_IN));
    poseSets[3].setOpacity(within(local, P4_IN, P5_IN));
    poseSets[4].setOpacity(local >= g2l(P5_IN) ? 1 : 0);

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
    root.removeFromParent();
    mounted = false;
  },
};
