/**
 * 01-newton (region x = 0). The proof of the whole look.
 *
 * A chalk tree grows root first, an apple condenses out of the canopy
 * hatching, drops along the film arc, and a figure seated under the tree
 * stands. Everything is built once in mount as four stroke sets and then
 * choreographed purely as a function of local scroll progress. Nothing here
 * keeps a clock, so the scene scrubs and deep links cleanly.
 *
 * The four sets, in order (draw call budget is four sets per scene):
 *   1. tree trunk and branches plus the canopy hatch
 *   2. the apple, authored around its own origin and carried by a group
 *   3. the seated figure
 *   4. the standing figure plus the ground
 *
 * Beat timings are written as global t, the same numbers the storyboard in
 * film.config uses, and remapped into this scene's range with g2l so the whole
 * file reads against one set of named constants. Growth 0.05 to 0.18, canopy
 * 0.14 to 0.20, apple resolves 0.18 to 0.22, drops 0.22 to 0.26, figure stands
 * 0.26 to 0.30, then the scene holds until the match cut at 0.315.
 */

import * as THREE from 'three';
import type { FilmContext, FilmScene, StrokeSetApi, StrokeStyle } from '../lib/types';
import { FILM, REGIONS } from '../film.config';
import { arcPoint, arcTangent } from './arc';
import { hatchDisk } from '../look/hatch';

/* ------------------------------------------------------------------ */
/* Range and remapping                                                 */
/* ------------------------------------------------------------------ */

const NEWTON_RANGE = FILM.scenes.find((s) => s.id === 'newton')?.range ?? [0.02, 0.315];
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

/** A draw window tuple, clamped into set draw space. */
function dw(a: number, b: number): [number, number] {
  return [clamp01(a), clamp01(b)];
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
/* Beats (global t, remapped through g2l)                              */
/* ------------------------------------------------------------------ */

const GROW_IN = 0.05; // trunk starts drawing
const CANOPY_OUT = 0.2; // set one draw ramp reaches full here
const APPLE_DRAW_IN = 0.18;
const APPLE_DRAW_OUT = 0.22;
const DROP_IN = 0.22;
const DROP_OUT = 0.26; // impact, next to the figure
const SEAT_DRAW_IN = 0.2; // the seated figure draws itself in
const SEAT_DRAW_OUT = 0.24;
const STAND_IN = 0.26; // seated un draws while standing draws
const STAND_OUT = 0.3;
const GROUND_DRAW_IN = 0.05; // ground shares set four but draws early

/* ------------------------------------------------------------------ */
/* Stroke styles (one style per set, widths overridden per stroke)     */
/* ------------------------------------------------------------------ */

const TREE_STYLE: Partial<StrokeStyle> = { widthPx: 2.6, wobbleAmp: 0.03, wobbleFreq: 1.6, dust: true, seed: 11 };
const APPLE_STYLE: Partial<StrokeStyle> = { widthPx: 2.2, wobbleAmp: 0.04, wobbleFreq: 2.0, dust: true, seed: 23 };
const FIG_STYLE: Partial<StrokeStyle> = { widthPx: 2.4, wobbleAmp: 0.05, wobbleFreq: 1.5, dust: true, seed: 37 };

/* ------------------------------------------------------------------ */
/* Tree generator                                                      */
/* ------------------------------------------------------------------ */

const TREE_SEED = 1337;
const TREE_MAX_DEPTH = 5; // levels of recursion below the trunk
const TRUNK_LEN = 2.5; // world units of the first segment
const LENGTH_FALLOFF = 0.75; // child length as a fraction of the parent
const BRANCH_SPREAD = 0.72; // angular fan between siblings, radians
const BRANCH_JITTER = 0.34; // random angle noise per branch, radians
const THREE_CHILD_CHANCE = 0.35; // chance a node forks three ways not two
const TWIG_COUNT = 4; // twigs sprayed off each last inner branch
const TWIG_SPREAD = 1.1; // twig fan width, radians
const BRANCH_SEGS = 8; // polyline segments on the trunk, fewer when deeper
const BRANCH_CURVE = 0.12; // gentle bow along a branch, fraction of length
const BRANCH_WOBBLE_AMP = 0.05; // baked hand wobble, fraction of length
const BRANCH_WOBBLE_FREQ = 1.7;
const BRANCH_Z_JITTER = 0.14; // a little depth so the orbit reads dimension
const TRUNK_WIDTH = 4.6; // chalk width in css px at the root
const TWIG_WIDTH = 1.4; // and at the tips
const TREE_MAX_STROKES = 260; // hard cap so the recursion can never explode
const ORDER_JITTER = 0.85; // growth order noise within a depth band
const TREE_DRAW_SPAN = 0.7; // branches occupy this much of set one draw space
const TREE_WINDOW_W = 0.2; // per branch draw on duration

interface Branch {
  pts: THREE.Vector3[];
  widthPx: number;
  /** Growth order 0..1, root at 0 and outer twigs near 1. */
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
  if (out.length >= TREE_MAX_STROKES) return;
  const segs = Math.max(3, BRANCH_SEGS - depth);
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const px = -dy; // unit perpendicular in the x y plane
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
  const widthPx = lerp(TRUNK_WIDTH, TWIG_WIDTH, depth / TREE_MAX_DEPTH);
  const order = (depth + rng() * ORDER_JITTER) / (TREE_MAX_DEPTH + 1);
  out.push({ pts, widthPx, order });
  if (depth >= TREE_MAX_DEPTH) return;

  const tip = pts[pts.length - 1];
  if (depth === TREE_MAX_DEPTH - 1) {
    // the last inner level sprays a fan of thin twigs
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

function buildTree(set: StrokeSetApi): void {
  const branches: Branch[] = [];
  growBranch(0, 0, 0, Math.PI / 2, TRUNK_LEN, 0, mulberry32(TREE_SEED), branches);
  // insertion order equals growth order, so the cascade is root first tips last
  branches.sort((a, b) => a.order - b.order);
  for (const b of branches) {
    const c = clamp01(b.order) * TREE_DRAW_SPAN;
    set.addStroke(b.pts, { widthPx: b.widthPx, drawWindow: dw(c, c + TREE_WINDOW_W) });
  }
}

/* ------------------------------------------------------------------ */
/* Canopy hatch, thickening after the branches                         */
/* ------------------------------------------------------------------ */

const CANOPY_SPACING = 0.26;
const CANOPY_CROSS = 1.15; // second hatch angle for cross hatching, radians
const CANOPY_WIDTH = 1.1;
const CANOPY_DRAW_IN = 0.6; // set one draw space, maps to global 0.14
const CANOPY_DRAW_SPAN = 0.36;
const CANOPY_WINDOW_W = 0.16;

/** Disks over the crown. The third one sits where the apple resolves. */
const CANOPY_CLUSTERS: { c: [number, number]; r: number; a: number; seed: number }[] = [
  { c: [-1.0, 5.1], r: 1.3, a: 0.35, seed: 201 },
  { c: [0.4, 5.9], r: 1.5, a: 1.2, seed: 202 },
  { c: [1.5, 6.2], r: 1.2, a: 0.7, seed: 203 },
  { c: [-0.3, 6.4], r: 1.15, a: 1.9, seed: 204 },
  { c: [0.9, 5.2], r: 1.25, a: 2.5, seed: 205 },
];

function buildCanopy(set: StrokeSetApi): void {
  const lines: THREE.Vector3[][] = [];
  for (const cl of CANOPY_CLUSTERS) {
    const center = new THREE.Vector3(cl.c[0], cl.c[1], 0);
    const a = hatchDisk(center, cl.r, cl.a, CANOPY_SPACING, cl.seed);
    const b = hatchDisk(center, cl.r * 0.85, cl.a + CANOPY_CROSS, CANOPY_SPACING * 1.2, cl.seed + 11);
    for (let i = 0; i < a.length; i++) lines.push(a[i]);
    for (let i = 0; i < b.length; i++) lines.push(b[i]);
  }
  const n = Math.max(1, lines.length - 1);
  for (let i = 0; i < lines.length; i++) {
    const c = CANOPY_DRAW_IN + (i / n) * CANOPY_DRAW_SPAN;
    set.addStroke(lines[i], { widthPx: CANOPY_WIDTH, drawWindow: dw(c, c + CANOPY_WINDOW_W) });
  }
}

/* ------------------------------------------------------------------ */
/* Apple                                                               */
/* ------------------------------------------------------------------ */

const APPLE_SEED = 909;
const APPLE_R = 0.24;
const APPLE_WIDTH = 2.2;
const TUMBLE_SPIN = -0.35; // gentle roll reached at impact, radians
const TUMBLE_ALIGN = 0.6; // how much it leans into the arc tangent
const SQUASH_AMT = 0.34; // vertical squash fraction at contact
const SQUASH_WIN = 0.014; // squash window width in global t, brief

// the lean the apple settles into once it is down, computed once at load
const REST_LEAN = (() => {
  const t = arcTangent(1, new THREE.Vector3());
  return (Math.atan2(t.y, t.x) + Math.PI * 0.5) * TUMBLE_ALIGN;
})();

/** A wobbly closed ring, used for the apple flesh and the figure heads. */
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

function buildApple(set: StrokeSetApi): void {
  // a small dense scribble of rings plus a stem, built around its own origin
  set.addStroke(ring(0.0, 0.0, APPLE_R, APPLE_SEED + 1, 20), { widthPx: APPLE_WIDTH, drawWindow: dw(0.0, 0.5) });
  set.addStroke(ring(0.03, 0.01, APPLE_R * 0.82, APPLE_SEED + 2, 18), { widthPx: APPLE_WIDTH, drawWindow: dw(0.1, 0.6) });
  set.addStroke(ring(-0.02, -0.01, APPLE_R * 0.62, APPLE_SEED + 3, 16), {
    widthPx: APPLE_WIDTH * 0.9,
    drawWindow: dw(0.2, 0.72),
  });
  set.addStroke(ring(0.01, 0.02, APPLE_R * 0.4, APPLE_SEED + 4, 14), {
    widthPx: APPLE_WIDTH * 0.8,
    drawWindow: dw(0.34, 0.85),
  });
  const stem = [
    new THREE.Vector3(0.02, APPLE_R * 0.85, 0),
    new THREE.Vector3(0.05, APPLE_R * 1.2, 0),
    new THREE.Vector3(0.03, APPLE_R * 1.5, 0),
  ];
  set.addStroke(stem, { widthPx: APPLE_WIDTH * 0.7, drawWindow: dw(0.55, 1.0) });
}

/** A brief compression pulse peaking just after impact, pure in local. */
function impactPulse(local: number): number {
  const c = g2l(DROP_OUT);
  const w = SQUASH_WIN / RANGE_SPAN;
  const d = (local - c) / w;
  if (d <= 0 || d >= 1) return 0;
  return Math.sin(d * Math.PI);
}

/* ------------------------------------------------------------------ */
/* Figure, seated and standing, silhouette from behind                 */
/* ------------------------------------------------------------------ */

const FIG_X = 3.4; // world x of the figure, next to the impact point
const FIG_WIDTH = 2.4;
const FIG_JITTER = 0.02; // hand drawn irregularity on authored points
const FIG_SEED_SEATED = 4100;
const FIG_SEED_STAND = 4200;
const SEATED_HEAD: [number, number, number] = [0.0, 1.15, 0.19]; // x offset, y, radius
const STAND_HEAD: [number, number, number] = [0.0, 2.2, 0.19];
const STAND_DRAW_IN = 0.84; // set four draw space, maps to global 0.26
const STAND_DRAW_SPAN = 0.15;

// hunched, hugging the knees, seen from behind, so no face is ever drawn
const SEATED_STROKES: number[][][] = [
  [[0.0, 0.95], [0.03, 0.72], [0.03, 0.5], [0.0, 0.42]], // back curve
  [[-0.19, 0.9], [0.0, 0.96], [0.19, 0.9]], // shoulders
  [[-0.04, 0.44], [-0.18, 0.52], [-0.28, 0.6]], // left thigh to raised knee
  [[-0.28, 0.6], [-0.24, 0.34], [-0.16, 0.08]], // left shin to foot
  [[0.04, 0.44], [0.18, 0.52], [0.28, 0.6]], // right thigh
  [[0.28, 0.6], [0.24, 0.34], [0.16, 0.08]], // right shin
  [[-0.17, 0.87], [-0.25, 0.68], [-0.28, 0.6]], // left arm resting on the knee
  [[0.17, 0.87], [0.25, 0.68], [0.28, 0.6]], // right arm
  [[-0.14, 0.42], [0.0, 0.4], [0.14, 0.42]], // seat and hips
  [[-0.16, 0.08], [-0.06, 0.05]], // left foot
  [[0.16, 0.08], [0.06, 0.05]], // right foot
  [[-0.06, 1.0], [0.06, 1.0]], // nape
];

// upright, arms at the sides, still from behind
const STANDING_STROKES: number[][][] = [
  [[0.0, 2.0], [0.0, 1.6], [0.0, 1.2], [0.0, 1.05]], // spine
  [[-0.23, 1.98], [0.0, 2.04], [0.23, 1.98]], // shoulders
  [[-0.22, 1.95], [-0.19, 1.5], [-0.15, 1.1]], // left torso side
  [[0.22, 1.95], [0.19, 1.5], [0.15, 1.1]], // right torso side
  [[-0.21, 1.95], [-0.25, 1.55], [-0.22, 1.15]], // left arm
  [[0.21, 1.95], [0.25, 1.55], [0.22, 1.15]], // right arm
  [[-0.15, 1.08], [0.0, 1.04], [0.15, 1.08]], // hips
  [[-0.11, 1.06], [-0.13, 0.6], [-0.14, 0.06]], // left leg
  [[0.11, 1.06], [0.13, 0.6], [0.14, 0.06]], // right leg
  [[-0.14, 0.06], [-0.24, 0.03]], // left foot
  [[0.14, 0.06], [0.24, 0.03]], // right foot
  [[-0.06, 2.02], [0.06, 2.02]], // nape
  [[-0.1, 1.82], [-0.07, 1.6]], // left shoulder blade
  [[0.1, 1.82], [0.07, 1.6]], // right shoulder blade
];

function poly(coords: number[][], baseX: number, baseY: number, seed: number): THREE.Vector3[] {
  const rng = mulberry32(seed);
  const pts: THREE.Vector3[] = [];
  for (const c of coords) {
    pts.push(
      new THREE.Vector3(baseX + c[0] + (rng() - 0.5) * FIG_JITTER, baseY + c[1] + (rng() - 0.5) * FIG_JITTER, (rng() - 0.5) * 0.02),
    );
  }
  return pts;
}

function buildSeated(set: StrokeSetApi): void {
  const all: THREE.Vector3[][] = [];
  all.push(ring(FIG_X + SEATED_HEAD[0], SEATED_HEAD[1], SEATED_HEAD[2], FIG_SEED_SEATED, 16));
  for (let i = 0; i < SEATED_STROKES.length; i++) {
    all.push(poly(SEATED_STROKES[i], FIG_X, 0, FIG_SEED_SEATED + i + 1));
  }
  const n = Math.max(1, all.length - 1);
  for (let i = 0; i < all.length; i++) {
    const c = (i / n) * 0.7;
    set.addStroke(all[i], { widthPx: FIG_WIDTH, drawWindow: dw(c, c + 0.34) });
  }
}

/* ------------------------------------------------------------------ */
/* Ground                                                              */
/* ------------------------------------------------------------------ */

const GROUND_SEED = 7007;
const GROUND_X0 = -7;
const GROUND_X1 = 9;
const GROUND_WOBBLE = 0.12;
const GROUND_WIDTH = 2.8;
const GRASS_PER = 7; // ticks per cluster, one cluster at the trunk, one at the figure
const GRASS_SPREAD = 1.6;
const GRASS_MIN = 0.08;
const GRASS_VAR = 0.16;
const GRASS_WIDTH = 1.5;

function buildGround(set: StrokeSetApi): void {
  const rng = mulberry32(GROUND_SEED);
  const steps = 42;
  const horizon: THREE.Vector3[] = [];
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    horizon.push(new THREE.Vector3(lerp(GROUND_X0, GROUND_X1, u), (rng() - 0.5) * GROUND_WOBBLE, (rng() - 0.5) * 0.05));
  }
  set.addStroke(horizon, { widthPx: GROUND_WIDTH, drawWindow: dw(0, 0.1) });
  let gi = 0;
  for (const cx of [0, FIG_X]) {
    for (let k = 0; k < GRASS_PER; k++) {
      const bx = cx + (rng() - 0.5) * GRASS_SPREAD;
      const h = GRASS_MIN + rng() * GRASS_VAR;
      const lean = (rng() - 0.5) * 0.4;
      const tick = [new THREE.Vector3(bx, 0, 0), new THREE.Vector3(bx + lean * h, h, 0)];
      const c = 0.02 + (gi % 5) * 0.015;
      set.addStroke(tick, { widthPx: GRASS_WIDTH, drawWindow: dw(c, c + 0.08) });
      gi++;
    }
  }
}

function buildStandingAndGround(set: StrokeSetApi): void {
  // ground draws early, near the front of set four draw space
  buildGround(set);
  // the standing pose draws only across global 0.26 to 0.30, at the tail
  const all: THREE.Vector3[][] = [];
  all.push(ring(FIG_X + STAND_HEAD[0], STAND_HEAD[1], STAND_HEAD[2], FIG_SEED_STAND, 16));
  for (let i = 0; i < STANDING_STROKES.length; i++) {
    all.push(poly(STANDING_STROKES[i], FIG_X, 0, FIG_SEED_STAND + i + 1));
  }
  const n = Math.max(1, all.length - 1);
  for (let i = 0; i < all.length; i++) {
    const c = STAND_DRAW_IN + (i / n) * STAND_DRAW_SPAN;
    set.addStroke(all[i], { widthPx: FIG_WIDTH, drawWindow: dw(c, c + 0.06) });
  }
}

/* ------------------------------------------------------------------ */
/* Scene                                                               */
/* ------------------------------------------------------------------ */

// preallocated scratch, so update never allocates
const _p = new THREE.Vector3();
const _t = new THREE.Vector3();

let root: THREE.Group;
let appleGroup: THREE.Group;
let treeSet: StrokeSetApi;
let appleSet: StrokeSetApi;
let seatedSet: StrokeSetApi;
let standSet: StrokeSetApi;
let mounted = false;

export const newtonScene: FilmScene = {
  id: 'newton',

  mount(ctx: FilmContext) {
    if (mounted) return;
    mounted = true;

    root = new THREE.Group();
    root.position.x = REGIONS.newton;
    appleGroup = new THREE.Group();

    treeSet = ctx.makeStrokeSet({ style: TREE_STYLE, maxPoints: 5200 });
    appleSet = ctx.makeStrokeSet({ style: APPLE_STYLE, maxPoints: 400 });
    seatedSet = ctx.makeStrokeSet({ style: FIG_STYLE, maxPoints: 400 });
    standSet = ctx.makeStrokeSet({ style: FIG_STYLE, maxPoints: 900 });

    buildTree(treeSet);
    buildCanopy(treeSet);
    buildApple(appleSet);
    buildSeated(seatedSet);
    buildStandingAndGround(standSet);

    root.add(treeSet.object3d);
    appleGroup.add(appleSet.object3d);
    root.add(appleGroup);
    root.add(seatedSet.object3d);
    root.add(standSet.object3d);

    treeSet.setOpacity(1);
    appleSet.setOpacity(1);
    seatedSet.setOpacity(1);
    standSet.setOpacity(1);

    ctx.three.scene.add(root);
  },

  update(local: number, _global: number, ctx: FilmContext) {
    if (!mounted) return;

    // draw on progress per set, all pure functions of local
    treeSet.setDraw(ramp(local, GROW_IN, CANOPY_OUT));
    appleSet.setDraw(ramp(local, APPLE_DRAW_IN, APPLE_DRAW_OUT));
    // the seated figure draws in, holds, then un draws as the standing figure appears
    seatedSet.setDraw(ramp(local, SEAT_DRAW_IN, SEAT_DRAW_OUT) * (1 - ramp(local, STAND_IN, STAND_OUT)));
    standSet.setDraw(ramp(local, GROUND_DRAW_IN, STAND_OUT));

    // the apple: fall along the shared arc with an ease in gravity feel,
    // a slight tumble taken from the arc tangent, and a squash at contact
    const s = ramp(local, DROP_IN, DROP_OUT);
    const sEased = s * s;
    arcPoint(sEased, _p);
    const sq = impactPulse(local) * SQUASH_AMT;
    appleGroup.position.set(_p.x, _p.y - APPLE_R * sq * 0.5, _p.z);
    // the tangent is only sampled while it is actually falling, so the
    // clone inside arcTangent never runs on a held frame
    let rot = 0;
    if (sEased >= 1) {
      rot = TUMBLE_SPIN + REST_LEAN;
    } else if (sEased > 0) {
      arcTangent(sEased, _t);
      const lean = (Math.atan2(_t.y, _t.x) + Math.PI * 0.5) * TUMBLE_ALIGN;
      rot = sEased * (TUMBLE_SPIN + lean);
    }
    appleGroup.rotation.z = rot;
    appleGroup.scale.set(1 + sq * 0.7, 1 - sq, 1);

    // one update per set per frame keeps the boil and the px widths correct
    const time = ctx.time();
    const cam = ctx.three.camera;
    const vp = ctx.viewport();
    treeSet.update(time, cam, vp);
    appleSet.update(time, cam, vp);
    seatedSet.update(time, cam, vp);
    standSet.update(time, cam, vp);
  },

  setVisible(v: boolean) {
    if (mounted) root.visible = v;
  },

  dispose() {
    if (!mounted) return;
    treeSet.dispose();
    appleSet.dispose();
    seatedSet.dispose();
    standSet.dispose();
    root.removeFromParent();
    mounted = false;
  },
};
