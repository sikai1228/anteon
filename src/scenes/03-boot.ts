/**
 * Link 3: ONE boot, alive from the cutout to the regolith print.
 *
 * There is no hidden cut and no second boot. The sole outline and its own
 * tread ridges draw over the flyer's held ridge field, posed in wing space so
 * the tread rows align with the rib rows on screen (the same presentation
 * basis the flyer uses). The flyer then fades entirely, leaving only this
 * boot on black. While the camera sweeps continuously from the wing to the
 * Moon (config keys 0.487 to 0.507, black world between the regions), the
 * boot travels with it, easing position, orientation, and scale from its
 * wing pose to its Moon stance. The user-approved settle: it may change size
 * and angle slightly during the carry, reading as the boot finding its
 * footing, never as a swap. Then it presses, dust bursts, the print resolves,
 * and the sole fades, all before the lunar wide.
 *
 * All timings are written in GLOBAL t (the update's second argument), since
 * this scene's beats are staged against camera keys, not its own range.
 */

import * as THREE from 'three';
import type { FilmContext, FilmScene, StrokeSetApi } from '../lib/types';
import { FILM, REGIONS } from '../film.config';

/* Timing, global t. The wing frame is held 0.465 to 0.487; the sweep to the
 * Moon runs 0.487 to 0.507; the press and print follow on the regolith. */
const OUTLINE_IN = 0.468; // the sole draws itself over the held ridge field
const OUTLINE_OUT = 0.479;
/* One unbroken motion from the swap to the ground: the boot lifts right
 * after the crop registers, the descent begins while the sweep is still
 * translating, and no window butts against another with a dead frame
 * between, so velocity never zeroes mid-story. */
const CARRY_IN = 0.4795; // = SWAP_T: the lift eases out of the swap instant itself
const CARRY_OUT = 0.507;
const PRESS_IN = 0.5; // touchdown starts inside the sweep: a curved step
const PRESS_OUT = 0.532;
const DUST_IN = 0.528;
const DUST_PEAK = 0.538;
const DUST_FADE_IN = 0.545;
const DUST_FADE_OUT = 0.578;
/* There is NO separate print object and the sole never fades: the boot
 * presses flat onto the regolith and its own lines simply remain as the
 * mark, persisting through the whole lunar sequence. Only the scatter of
 * displaced regolith draws in around it, because that is new information. */
const SCATTER_IN = 0.535;
const SCATTER_OUT = 0.56;

/* After the swap the boot leaves the wing at half scale and keeps
 * SHRINKING through the dark carry, so what presses into the regolith is
 * a footprint, not a monument. The trail then walks the rest of the way
 * to the flag: small mirrored steps, NEW marks that draw in after the
 * scatter; the pressed print's own lines still never change. */
const GROUND_SCALE = 0.22;
const STEPS_IN = 0.558;
const STEPS_OUT = 0.62;
const TRAIL_N = 3;
const TRAIL_HIP = 0.26;
const TRAIL_YAW = 0.09;
/* The flag pole's world x, from the camera's flag approach target. */
const POLE_X = 183.85;

/* Geometry, local units. Sole in local x-z, heel to toe along x, tread
 * ridges spaced along x and running across the width along z. */
const SOLE_HALF_LEN = 1.774;
const SOLE_HALF_WID = 1.132;

/* The tread IS the ribs, cropped. At the swap instant the flyer vanishes and
 * these ridges remain: they sit at the exact projected positions of the ribs
 * they inherit (same pitch mapped through the wing scale, same width, same
 * boil phase), clipped to the sole outline's width at each station, so the
 * viewer sees the existing lines lose everything outside the boot. */
const SWAP_T = 0.4795;
const RIB_WIDTH_PX = 1.9;
const RIB_BOIL_SEED = 7; // matches the flyer's rib boil phase exactly
/* The rib row sits on the wing plane, 0.75 world units BEYOND the aim at
 * the presentation (the model flip maps it away from camera; aim distance
 * about 3.885), so its screen pitch is narrower than the world pitch by
 * D / (D + 0.75). The inherited tread bakes that in so the surviving line
 * segments coincide exactly across the swap; verified numerically. */
const AIM_DIST = 3.885;
const DEPTH_COMP = AIM_DIST / (AIM_DIST + 0.75);
const RIB_PITCH_WORLD = ((4.5 * 0.95 * 2) / 47) * DEPTH_COMP; // flyer HS 4.5, 48 ribs

/* The wing pose: centred on the held camera's aim, facing the camera, scaled
 * so the sole owns the middle of the locked frame. */
const PRESENT_T = 0.465;
const WING_SCALE = 0.5;
/* The Moon stance. */
const MOON_HOVER_Y = 0.6;
const MOON_GROUND_Y = 0.02;

/* The print is the classic bare footprint pictogram: a foot pad (ball,
 * arch, heel) with five detached toe rounds above it. The pad's two edges
 * are the single source both the outline and the tread clipping derive
 * from, so the inherited bars can never detach from the silhouette; the
 * toes are the sole's own strokes, drawn in the same cutout window as the
 * outline, before the swap. Medial (-z) carries the arch and the big toe. */
const EDGE_LATERAL: readonly (readonly [number, number])[] = [
  [-1.047, 0],
  [-1.0, 0.4],
  [-0.9, 0.58],
  [-0.7, 0.62],
  [-0.45, 0.6],
  [-0.2, 0.62],
  [0.05, 0.78],
  [0.3, 0.92],
  [0.45, 0.88],
  [0.56, 0.5],
  [0.6, 0],
];

const EDGE_MEDIAL: readonly (readonly [number, number])[] = [
  [-1.047, 0],
  [-1.0, 0.38],
  [-0.9, 0.55],
  [-0.72, 0.58],
  [-0.5, 0.48],
  [-0.28, 0.35],
  [-0.05, 0.38],
  [0.2, 0.7],
  [0.4, 0.85],
  [0.55, 0.6],
  [0.6, 0],
];

/* The five toes, centers in normalized length and width, radii in local
 * units, big toe on the medial side, shrinking toward the pinky. */
const TOES: readonly (readonly [number, number, number])[] = [
  [0.75, -0.55, 0.24],
  [0.84, -0.18, 0.14],
  [0.86, 0.14, 0.12],
  [0.81, 0.43, 0.11],
  [0.72, 0.68, 0.1],
];

const soleGroup = new THREE.Group();
const dustGroup = new THREE.Group();
const moonGroup = new THREE.Group();
const sceneGroup = new THREE.Group();
let sole!: StrokeSetApi;
let tread!: StrokeSetApi;
let dust!: StrokeSetApi;
let print!: StrokeSetApi;
let steps!: StrokeSetApi;

const _pos = new THREE.Vector3();
const WING_POS = new THREE.Vector3();
const MOON_POS = new THREE.Vector3(REGIONS.moon, MOON_HOVER_Y, 0);
const Q_IDENT = new THREE.Quaternion();
const _q = new THREE.Quaternion();

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}
function smoothstep(a: number, b: number, x: number): number {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
}
function mix(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
function poly(coords: readonly (readonly [number, number, number])[]): THREE.Vector3[] {
  const out: THREE.Vector3[] = [];
  for (const c of coords) out.push(new THREE.Vector3(c[0], c[1], c[2]));
  return out;
}
function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The wing pose, built from the presentation camera key exactly as the flyer
 * builds its presentation basis: the sole's tread spacing axis (local x) maps
 * to screen up so the ridges stack vertically and run horizontally, the same
 * read as the ribs they replace, and the sole faces the camera.
 */
const Q_WING = (() => {
  const key = FILM.camera.find((k) => Math.abs(k.t - PRESENT_T) < 1e-6);
  const pos = key ? key.pos : [29.6, 11.9, 3.0];
  const tgt = key ? key.target : [31.8, 11.85, -0.2];
  const rollDeg = key && key.roll !== undefined ? key.roll : 78;
  WING_POS.set(tgt[0], tgt[1], tgt[2]);
  const d = new THREE.Vector3(tgt[0] - pos[0], tgt[1] - pos[1], tgt[2] - pos[2]).normalize();
  const worldUp = new THREE.Vector3(0, 1, 0);
  const right0 = new THREE.Vector3().crossVectors(d, worldUp).normalize();
  const up0 = new THREE.Vector3().crossVectors(right0, d).normalize();
  const roll = (rollDeg * Math.PI) / 180;
  const cr = Math.cos(roll);
  const sr = Math.sin(roll);
  const screenUp = up0.clone().multiplyScalar(cr).addScaledVector(right0, sr).normalize();
  const negD = d.clone().negate();
  const zAxis = new THREE.Vector3().crossVectors(screenUp, negD).normalize();
  const m = new THREE.Matrix4().makeBasis(screenUp, negD, zAxis);
  return new THREE.Quaternion().setFromRotationMatrix(m);
})();

/** One closed line around the pad: up the lateral edge, back down the
 * medial edge, closing on the heel tip it started from. zSign -1 mirrors
 * the foot for the other side of the pair. */
function soleOutline(y: number, zSign = 1): THREE.Vector3[] {
  const pts: THREE.Vector3[] = [];
  for (const p of EDGE_LATERAL)
    pts.push(new THREE.Vector3(p[0] * SOLE_HALF_LEN, y, p[1] * SOLE_HALF_WID * zSign));
  const medial = [...EDGE_MEDIAL].reverse().slice(1);
  for (const p of medial)
    pts.push(new THREE.Vector3(p[0] * SOLE_HALF_LEN, y, -p[1] * SOLE_HALF_WID * zSign));
  return pts;
}

/** An edge's half width at a normalized station x in [-1..1]. */
function edgeHalf(edge: readonly (readonly [number, number])[], xn: number): number {
  if (xn <= edge[0][0] || xn >= edge[edge.length - 1][0]) return 0;
  for (let i = 0; i < edge.length - 1; i++) {
    if (xn <= edge[i + 1][0]) {
      const f = (xn - edge[i][0]) / (edge[i + 1][0] - edge[i][0]);
      return mix(edge[i][1], edge[i + 1][1], f);
    }
  }
  return 0;
}

/** The inherited ribs: ridges at the ribs' own projected stations, clipped to
 * the outline, matching the flyer's rib width and boil phase. */
function treadPaths(y: number, zSign = 1): THREE.Vector3[][] {
  const paths: THREE.Vector3[][] = [];
  const pitchLocal = RIB_PITCH_WORLD / WING_SCALE;
  const kMax = Math.floor(SOLE_HALF_LEN / pitchLocal - 0.5);
  for (let k = -kMax - 1; k <= kMax; k++) {
    const x = (k + 0.5) * pitchLocal;
    const xn = x / SOLE_HALF_LEN;
    const lat = edgeHalf(EDGE_LATERAL, xn) * SOLE_HALF_WID * 0.96;
    const med = edgeHalf(EDGE_MEDIAL, xn) * SOLE_HALF_WID * 0.96;
    if (lat + med < 0.24) continue;
    paths.push(
      poly([
        [x, y, -med * zSign],
        [x, y, ((lat - med) / 2) * zSign],
        [x, y, lat * zSign],
      ]),
    );
  }
  return paths;
}

function buildInheritedTread(set: StrokeSetApi, y: number, widthPx: number, boil?: number): void {
  for (const path of treadPaths(y))
    set.addStroke(path, boil !== undefined ? { widthPx, boilSeed: boil } : { widthPx });
}

/** One toe: a small hand-drawn round, closed back on its start. */
function toeRound(cx: number, cz: number, r: number, y: number): THREE.Vector3[] {
  const pts: THREE.Vector3[] = [];
  const N = 11;
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * Math.PI * 2;
    // a light squash keeps the rounds toe-like rather than perfect circles
    pts.push(new THREE.Vector3(cx + Math.cos(a) * r, y, cz + Math.sin(a) * r * 0.88));
  }
  return pts;
}

function toePaths(y: number, zSign = 1): THREE.Vector3[][] {
  const paths: THREE.Vector3[][] = [];
  for (const [xn, zn, r] of TOES)
    paths.push(toeRound(xn * SOLE_HALF_LEN, zn * SOLE_HALF_WID * zSign, r, y));
  return paths;
}

function buildToes(set: StrokeSetApi, y: number, widthPx?: number, zSign = 1): void {
  for (const path of toePaths(y, zSign))
    set.addStroke(path, widthPx !== undefined ? { widthPx } : undefined);
}

function buildSole(set: StrokeSetApi): void {
  // The pad outline and the five toes are the sole's own drawing, all in
  // the cutout window before the swap; the bars inside are the ribs.
  set.addStroke(soleOutline(0));
  buildToes(set, 0);
}

/** Yaw a step's full-scale paths and set them in place. Geometry stays at
 * the foot's own scale (positions pre-divided by the set's ground scale),
 * so the build-time hand wobble shrinks with the object exactly like the
 * pressed print's does; baking the scale into points instead turns the
 * small prints into scribble. */
function placeStep(paths: THREE.Vector3[][], x: number, z: number, yaw: number): THREE.Vector3[][] {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  for (const path of paths) {
    for (const p of path) {
      const px = p.x;
      const pz = p.z;
      p.x = x + px * c + pz * s;
      p.z = z - px * s + pz * c;
      p.y = 0;
    }
  }
  return paths;
}

/** The walk through the anchor print: alternating left and right prints,
 * the existing footprint in miniature (outline, toes, and bars). Each
 * stride adds a pair, one print BEHIND the anchor toward the lander and
 * one AHEAD toward the flag, so the trail reveals backward and forward in
 * time together as it draws. */
function buildTrail(set: StrokeSetApi): void {
  const stride = (POLE_X - REGIONS.moon) / (TRAIL_N + 0.9) / GROUND_SCALE;
  const hip = TRAIL_HIP / GROUND_SCALE;
  for (let k = 1; k <= TRAIL_N; k++) {
    // same parity both ways: the feet alternate correctly out from the
    // anchor in each direction
    const zSign = k % 2 === 1 ? -1 : 1;
    // every stroke of stride k, both directions, shares one window: the
    // pair behind and ahead appears at exactly the same moment
    const win: [number, number] = [(k - 1) / TRAIL_N, k / TRAIL_N];
    for (const dir of [-1, 1] as const) {
      // the walk stops short of the flag: no print directly under the pole
      if (dir === 1 && k === TRAIL_N) continue;
      const x = dir * k * stride;
      const z = zSign * hip;
      const yaw = -zSign * TRAIL_YAW;
      const outline = placeStep([soleOutline(0, zSign)], x, z, yaw);
      for (const path of outline) set.addStroke(path, { widthPx: 2.2, drawWindow: win });
      const toes = placeStep(toePaths(0, zSign), x, z, yaw);
      for (const path of toes) set.addStroke(path, { widthPx: 2.0, drawWindow: win });
      const bars = placeStep(treadPaths(0, zSign), x, z, yaw);
      for (const path of bars) set.addStroke(path, { widthPx: 1.6, drawWindow: win });
    }
  }
}

function buildScatter(set: StrokeSetApi): void {
  // displaced regolith around the landing: NEW marks, so they may draw in;
  // the boot's own lines are never duplicated or redrawn
  const rng = makeRng(37);
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 + rng() * 0.4;
    const rad = 1.9 + rng() * 0.6;
    const bx = Math.cos(a) * rad;
    const bz = Math.sin(a) * rad * 0.7;
    set.addStroke(
      poly([
        [bx, 0.02, bz],
        [bx + Math.cos(a) * 0.35, 0.06, bz + Math.sin(a) * 0.25],
      ]),
      { widthPx: 1.5 },
    );
  }
}

function buildDust(set: StrokeSetApi): void {
  const rng = makeRng(91);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + rng() * 0.5;
    const rad = 1.3 + rng() * 0.9;
    const bx = Math.cos(a) * rad;
    const bz = Math.sin(a) * rad * 0.7;
    const len = 0.4 + rng() * 0.5;
    set.addStroke(
      poly([
        [bx, 0, bz],
        [bx + Math.cos(a) * len, 0.2 + rng() * 0.25, bz + Math.sin(a) * len * 0.7],
      ]),
      { widthPx: 1.4 },
    );
  }
}

export const bootScene: FilmScene = {
  id: 'boot',
  mount(ctx: FilmContext) {
    sole = ctx.makeStrokeSet({ style: { widthPx: 2.6 }, maxPoints: 280 });
    tread = ctx.makeStrokeSet({ style: { widthPx: RIB_WIDTH_PX, dust: false, wobbleAmp: 0 }, maxPoints: 120 });
    dust = ctx.makeStrokeSet({ style: { widthPx: 1.4, dust: false }, maxPoints: 128 });
    print = ctx.makeStrokeSet({ style: { widthPx: 1.9, dust: false }, maxPoints: 300 });
    steps = ctx.makeStrokeSet({ style: { widthPx: 1.9, dust: false }, maxPoints: 800 });
    buildSole(sole);
    buildInheritedTread(tread, 0, RIB_WIDTH_PX, RIB_BOIL_SEED);
    buildDust(dust);
    buildScatter(print);
    buildTrail(steps);
    tread.setDraw(1); // fully built; it appears by the opacity step at the swap

    // the one boot: free-floating group posed in absolute world space,
    // starting on the wing and carried to the Moon
    soleGroup.add(sole.object3d, tread.object3d);
    soleGroup.position.copy(WING_POS);
    soleGroup.quaternion.copy(Q_WING);
    soleGroup.scale.setScalar(WING_SCALE);

    // the ground story lives at the moon region as before; the burst and
    // the scatter shrink with the print they belong to, and the trail's
    // ground scale is baked into its own geometry
    moonGroup.position.set(REGIONS.moon, 0, 0);
    dustGroup.add(dust.object3d);
    dustGroup.scale.setScalar(GROUND_SCALE);
    print.object3d.scale.setScalar(GROUND_SCALE);
    steps.object3d.scale.setScalar(GROUND_SCALE);
    moonGroup.add(dustGroup, print.object3d, steps.object3d);

    sceneGroup.add(soleGroup, moonGroup);
    ctx.three.scene.add(sceneGroup);
  },

  update(_local: number, g: number, ctx: FilmContext) {
    // the sole draws itself over the held ridge field; at the swap instant the
    // flyer vanishes and the inherited, cropped ribs remain as the tread.
    // From then on the boot's lines are permanent: pressed flat, they ARE the
    // print, never faded, never redrawn.
    sole.setDraw(smoothstep(OUTLINE_IN, OUTLINE_OUT, g));
    tread.setOpacity(g >= SWAP_T ? 1 : 0);

    // the carry: one continuous pose blend from wing to Moon, matched to the
    // camera sweep window so the boot stays large in frame through the dark
    // the boot shrinks through the dark carry: it leaves the wing at half
    // scale and lands at footprint scale, so the press reads as a step,
    // not a monument
    const cs = smoothstep(CARRY_IN, CARRY_OUT, g);
    _pos.lerpVectors(WING_POS, MOON_POS, cs);
    _q.copy(Q_WING).slerp(Q_IDENT, cs);
    soleGroup.quaternion.copy(_q);
    soleGroup.scale.setScalar(mix(WING_SCALE, GROUND_SCALE, cs));

    // then the press: same group, same boot, descending onto the regolith,
    // where it dissolves in place into its own print
    const press = smoothstep(PRESS_IN, PRESS_OUT, g);
    _pos.y = mix(_pos.y, MOON_GROUND_Y, press);
    soleGroup.position.copy(_pos);

    dust.setDraw(smoothstep(DUST_IN, PRESS_OUT + 0.006, g));
    dust.setOpacity(smoothstep(DUST_IN, DUST_PEAK, g) * (1 - smoothstep(DUST_FADE_IN, DUST_FADE_OUT, g)));
    dustGroup.position.y = mix(0, 0.5 * GROUND_SCALE, smoothstep(PRESS_OUT, DUST_FADE_OUT, g));

    print.setDraw(smoothstep(SCATTER_IN, SCATTER_OUT, g));
    steps.setDraw(smoothstep(STEPS_IN, STEPS_OUT, g));

    const t = ctx.time();
    const cam = ctx.three.camera;
    const vp = ctx.viewport();
    sole.update(t, cam, vp);
    tread.update(t, cam, vp);
    dust.update(t, cam, vp);
    print.update(t, cam, vp);
    steps.update(t, cam, vp);
  },

  setVisible(v: boolean) {
    sceneGroup.visible = v;
  },

  dispose() {
    sole.dispose();
    tread.dispose();
    dust.dispose();
    print.dispose();
    steps.dispose();
  },
};
