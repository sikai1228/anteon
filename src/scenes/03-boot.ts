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
const CARRY_IN = 0.487; // the boot rides the camera sweep through the dark
const CARRY_OUT = 0.507;
const PRESS_IN = 0.509; // contact with the regolith
const PRESS_OUT = 0.532;
const DUST_IN = 0.528;
const DUST_PEAK = 0.538;
const DUST_FADE_IN = 0.545;
const DUST_FADE_OUT = 0.578;
const PRINT_IN = 0.535;
const PRINT_OUT = 0.585;
/* The boot leaves by stepping off, not by deletion: it lifts and drifts
 * forward while fading, gone before the flag pole draws at about 0.648. */
const SOLE_FADE_IN = 0.545;
const SOLE_FADE_OUT = 0.605;
const EXIT_LIFT = 1.5;
const EXIT_DRIFT = 0.9;

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
const RIB_PITCH_WORLD = (4.5 * 0.95 * 2) / 47; // flyer HS 4.5, 48 ribs
const RIB_WIDTH_PX = 1.9;
const RIB_BOIL_SEED = 7; // matches the flyer's rib boil phase exactly

/* The wing pose: centred on the held camera's aim, facing the camera, scaled
 * so the sole owns the middle of the locked frame. */
const PRESENT_T = 0.465;
const WING_SCALE = 0.5;
/* The Moon stance. */
const MOON_HOVER_Y = 0.6;
const MOON_GROUND_Y = 0.02;

const BOOT_OUTLINE: readonly (readonly [number, number])[] = [
  [-0.941, -0.581],
  [-0.118, -1.0],
  [0.706, -0.953],
  [0.953, 0],
  [0.706, 0.953],
  [-0.118, 1.0],
  [-0.941, 0.581],
  [-1.047, 0],
  [-0.941, -0.581],
];

const soleGroup = new THREE.Group();
const dustGroup = new THREE.Group();
const moonGroup = new THREE.Group();
const sceneGroup = new THREE.Group();
let sole!: StrokeSetApi;
let tread!: StrokeSetApi;
let dust!: StrokeSetApi;
let print!: StrokeSetApi;

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

function soleOutline(y: number): THREE.Vector3[] {
  const pts: THREE.Vector3[] = [];
  for (const p of BOOT_OUTLINE) pts.push(new THREE.Vector3(p[0] * SOLE_HALF_LEN, y, p[1] * SOLE_HALF_WID));
  return pts;
}

/** The sole's half width at a normalized station x in [-1..1], interpolated
 * from the outline polygon's positive-z edge. */
function widthAtNorm(xn: number): number {
  const edge: [number, number][] = [
    [-1.047, 0],
    [-0.941, 0.581],
    [-0.118, 1.0],
    [0.706, 0.953],
    [0.953, 0],
  ];
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
function buildInheritedTread(set: StrokeSetApi, y: number, widthPx: number, boil?: number): void {
  const pitchLocal = RIB_PITCH_WORLD / WING_SCALE;
  const kMax = Math.floor(SOLE_HALF_LEN / pitchLocal - 0.5);
  for (let k = -kMax - 1; k <= kMax; k++) {
    const x = (k + 0.5) * pitchLocal;
    const xn = x / SOLE_HALF_LEN;
    const half = widthAtNorm(xn) * SOLE_HALF_WID * 0.96;
    if (half < 0.12) continue;
    set.addStroke(
      poly([
        [x, y, -half],
        [x, y + 0.05, 0],
        [x, y, half],
      ]),
      boil !== undefined ? { widthPx, boilSeed: boil } : { widthPx },
    );
  }
}

function buildSole(set: StrokeSetApi): void {
  set.addStroke(soleOutline(0));
  set.addStroke(
    poly([
      [-SOLE_HALF_LEN * 0.42, 0, -SOLE_HALF_WID * 0.7],
      [-SOLE_HALF_LEN * 0.42, 0, SOLE_HALF_WID * 0.7],
    ]),
  );
}

function buildPrint(set: StrokeSetApi): void {
  set.addStroke(soleOutline(0.02), { widthPx: 1.8 });
  // the print inherits the same rib-derived stations as the sole's tread, so
  // the plane's lines become the tread become the mark, one lineage
  buildInheritedTread(set, 0.02, 1.7);
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
    tread = ctx.makeStrokeSet({ style: { widthPx: RIB_WIDTH_PX, dust: false }, maxPoints: 120 });
    dust = ctx.makeStrokeSet({ style: { widthPx: 1.4, dust: false }, maxPoints: 128 });
    print = ctx.makeStrokeSet({ style: { widthPx: 1.9, dust: false }, maxPoints: 300 });
    buildSole(sole);
    buildInheritedTread(tread, 0, RIB_WIDTH_PX, RIB_BOIL_SEED);
    buildDust(dust);
    buildPrint(print);
    tread.setDraw(1); // fully built; it appears by the opacity step at the swap

    // the one boot: free-floating group posed in absolute world space,
    // starting on the wing and carried to the Moon
    soleGroup.add(sole.object3d, tread.object3d);
    soleGroup.position.copy(WING_POS);
    soleGroup.quaternion.copy(Q_WING);
    soleGroup.scale.setScalar(WING_SCALE);

    // the ground story lives at the moon region as before
    moonGroup.position.set(REGIONS.moon, 0, 0);
    dustGroup.add(dust.object3d);
    moonGroup.add(dustGroup, print.object3d);

    sceneGroup.add(soleGroup, moonGroup);
    ctx.three.scene.add(sceneGroup);
  },

  update(_local: number, g: number, ctx: FilmContext) {
    // the sole draws itself over the held ridge field; at the swap instant the
    // flyer vanishes and the inherited, cropped ribs remain as the tread
    sole.setDraw(smoothstep(OUTLINE_IN, OUTLINE_OUT, g));
    const soleAlpha = 1 - smoothstep(SOLE_FADE_IN, SOLE_FADE_OUT, g);
    tread.setOpacity(g >= SWAP_T ? soleAlpha : 0);

    // the carry: one continuous pose blend from wing to Moon, matched to the
    // camera sweep window so the boot stays large in frame through the dark
    const cs = smoothstep(CARRY_IN, CARRY_OUT, g);
    _pos.lerpVectors(WING_POS, MOON_POS, cs);
    _q.copy(Q_WING).slerp(Q_IDENT, cs);
    soleGroup.quaternion.copy(_q);
    soleGroup.scale.setScalar(mix(WING_SCALE, 1, cs));

    // then the press: same group, same boot, descending onto the regolith
    const press = smoothstep(PRESS_IN, PRESS_OUT, g);
    _pos.y = mix(_pos.y, MOON_GROUND_Y, press);

    // and the exit: the boot steps off, lifting and drifting as it fades,
    // never just deleted in place
    const exit = smoothstep(SOLE_FADE_IN, SOLE_FADE_OUT, g);
    _pos.y += exit * EXIT_LIFT;
    _pos.x += exit * EXIT_DRIFT;
    soleGroup.position.copy(_pos);

    sole.setOpacity(soleAlpha);

    dust.setDraw(smoothstep(DUST_IN, PRESS_OUT + 0.006, g));
    dust.setOpacity(smoothstep(DUST_IN, DUST_PEAK, g) * (1 - smoothstep(DUST_FADE_IN, DUST_FADE_OUT, g)));
    dustGroup.position.y = mix(0, 0.5, smoothstep(PRESS_OUT, DUST_FADE_OUT, g));

    print.setDraw(smoothstep(PRINT_IN, PRINT_OUT, g));

    const t = ctx.time();
    const cam = ctx.three.camera;
    const vp = ctx.viewport();
    sole.update(t, cam, vp);
    tread.update(t, cam, vp);
    dust.update(t, cam, vp);
    print.update(t, cam, vp);
  },

  setVisible(v: boolean) {
    sceneGroup.visible = v;
  },

  dispose() {
    sole.dispose();
    tread.dispose();
    dust.dispose();
    print.dispose();
  },
};
