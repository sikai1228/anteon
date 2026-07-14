/**
 * Link 3: an A7L-style boot sole presses into the regolith and leaves a print.
 *
 * The sole is built in the local x-z plane, tread ridges spaced along x and
 * running along z, so at the 0.475 camera the ridges read as the same row of
 * parallel ridges the flyer ribs made at 0.465. That shared framing is where
 * the match cut hides. The sole presses down (group y), dust ticks burst at
 * contact, then the sole set fades out while the print set draws the tread flat
 * on the ground with a scatter of displaced regolith around it.
 */

import * as THREE from 'three';
import type { FilmContext, FilmScene, StrokeSetApi } from '../lib/types';
import { REGIONS } from '../film.config';

/* Timing, all in local 0..1. */
const DRAW_SOLE_OUT = 0.1; // drawn before the 0.475 cut at local 0.12
const PRESS_IN = 0.1;
const PRESS_OUT = 0.35;
const DUST_IN = 0.32;
const DUST_PEAK = 0.38;
const DUST_FADE_IN = 0.42;
const DUST_FADE_OUT = 0.6;
const SOLE_FADE_IN = 0.42;
const SOLE_FADE_OUT = 0.62;
const PRINT_IN = 0.4;
const PRINT_OUT = 0.7;

/* Geometry, world units. Sole in local x-z, tread spaced along x, running z. */
const SOLE_HALF_LEN = 1.6; // heel to toe along x
const TREADS = 12;
const TREAD_HALF_RUN = 0.85; // along z
const PRESS_TOP = 1.2; // raised height the sole descends from

const root = new THREE.Group();
const soleGroup = new THREE.Group();
const dustGroup = new THREE.Group();
let sole!: StrokeSetApi;
let dust!: StrokeSetApi;
let print!: StrokeSetApi;

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

function soleOutline(y: number): THREE.Vector3[] {
  // a rounded boot sole, toe toward positive x, heel toward negative x
  return poly([
    [-1.6, y, -0.5],
    [-0.2, y, -0.86],
    [1.2, y, -0.82],
    [1.62, y, 0],
    [1.2, y, 0.82],
    [-0.2, y, 0.86],
    [-1.6, y, 0.5],
    [-1.78, y, 0],
    [-1.6, y, -0.5],
  ]);
}

function treadRuns(set: StrokeSetApi, y: number, width: number): void {
  for (let i = 0; i < TREADS; i++) {
    const x = mix(-1.45, 1.45, i / (TREADS - 1));
    const r = TREAD_HALF_RUN * (1 - 0.25 * Math.abs(x) / SOLE_HALF_LEN);
    set.addStroke(
      poly([
        [x, y, -r],
        [x, y + 0.02, 0],
        [x, y, r],
      ]),
      { widthPx: width },
    );
  }
}

function buildSole(set: StrokeSetApi): void {
  set.addStroke(soleOutline(0));
  set.addStroke(poly([[-0.8, 0, -0.6], [-0.8, 0, 0.6]])); // heel to instep break
  treadRuns(set, 0, 2.0);
}

function buildPrint(set: StrokeSetApi): void {
  // the lasting mark, flat on the regolith just above the ground plane
  set.addStroke(soleOutline(0.02), { widthPx: 1.8 });
  treadRuns(set, 0.02, 1.7);
  const rng = makeRng(37);
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 + rng() * 0.4;
    const rad = 1.6 + rng() * 0.5;
    const bx = Math.cos(a) * rad;
    const bz = Math.sin(a) * rad * 0.7;
    set.addStroke(
      poly([
        [bx, 0.02, bz],
        [bx + Math.cos(a) * 0.25, 0.06, bz + Math.sin(a) * 0.18],
      ]),
      { widthPx: 1.5 },
    );
  }
}

function buildDust(set: StrokeSetApi): void {
  // short ticks radiating from the footprint, thrown out at contact
  const rng = makeRng(91);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + rng() * 0.5;
    const rad = 1.0 + rng() * 0.9;
    const bx = Math.cos(a) * rad;
    const bz = Math.sin(a) * rad * 0.7;
    const len = 0.3 + rng() * 0.4;
    set.addStroke(
      poly([
        [bx, 0, bz],
        [bx + Math.cos(a) * len, 0.15 + rng() * 0.2, bz + Math.sin(a) * len * 0.7],
      ]),
      { widthPx: 1.4 },
    );
  }
}

export const bootScene: FilmScene = {
  id: 'boot',
  mount(ctx: FilmContext) {
    sole = ctx.makeStrokeSet({ style: { widthPx: 2.4 }, maxPoints: 260 });
    dust = ctx.makeStrokeSet({ style: { widthPx: 1.4, dust: false }, maxPoints: 128 });
    print = ctx.makeStrokeSet({ style: { widthPx: 1.9, dust: false }, maxPoints: 260 });
    buildSole(sole);
    buildDust(dust);
    buildPrint(print);
    soleGroup.add(sole.object3d);
    dustGroup.add(dust.object3d);
    root.add(soleGroup, dustGroup, print.object3d);
    root.position.set(REGIONS.moon, 0, 0);
    ctx.three.scene.add(root);
  },

  update(local: number, _global: number, ctx: FilmContext) {
    // the sole draws before the cut, presses to contact, then fades to the print
    sole.setDraw(smoothstep(0, DRAW_SOLE_OUT, local));
    soleGroup.position.y = mix(PRESS_TOP, 0, smoothstep(PRESS_IN, PRESS_OUT, local));
    sole.setOpacity(1 - smoothstep(SOLE_FADE_IN, SOLE_FADE_OUT, local));

    // dust bursts at contact then lifts and dissipates
    dust.setDraw(smoothstep(DUST_IN, PRESS_OUT + 0.05, local));
    dust.setOpacity(
      smoothstep(DUST_IN, DUST_PEAK, local) * (1 - smoothstep(DUST_FADE_IN, DUST_FADE_OUT, local)),
    );
    dustGroup.position.y = mix(0, 0.6, smoothstep(PRESS_OUT, DUST_FADE_OUT, local));

    // the print resolves as the sole leaves
    print.setDraw(smoothstep(PRINT_IN, PRINT_OUT, local));

    const t = ctx.time();
    const cam = ctx.three.camera;
    const vp = ctx.viewport();
    sole.update(t, cam, vp);
    dust.update(t, cam, vp);
    print.update(t, cam, vp);
  },

  setVisible(v: boolean) {
    root.visible = v;
  },

  dispose() {
    sole.dispose();
    dust.dispose();
    print.dispose();
  },
};
