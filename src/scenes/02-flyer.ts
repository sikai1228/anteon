/**
 * Link 2: the 1903 Flyer, drawn as chalk and flown off the shared takeoff arc.
 *
 * Geometry is built once at mount in a money-shot-native local frame: the wing
 * lives in the local x-y plane, span along x, ribs running along y (the chord),
 * with the biplane gap along z. At the presentation pose (group rotation zero)
 * the upper wing is edge-on to the 0.465 camera and its ribs read as a row of
 * parallel ridges filling the frame, matched to the boot tread at 0.475.
 *
 * arcFlyerPoint climbs to negative x and up past y 19, which disagrees with the
 * flyer camera keys (they look toward positive x and stay near y 4.7). So only
 * the first sliver of that arc is used for the liftoff read, then the group
 * eases into the framing anchor for the match cut. See the report for the exact
 * camera or arc change this wants.
 */

import * as THREE from 'three';
import type { FilmContext, FilmScene, StrokeSetApi } from '../lib/types';
import { arcFlyerPoint } from './arc';

/* Timing, all in local 0..1. */
const DRAW_AIR_IN = 0.0;
const DRAW_AIR_OUT = 0.12;
const DRAW_RIB_IN = 0.03;
const DRAW_RIB_OUT = 0.15;
const FLY_IN = 0.1;
const CLIMB_OUT = 0.7; // arc portion is spent by here, then the settle dominates
const ARC_S_MAX = 0.14; // only this sliver of arcFlyerPoint keeps the plane in frame
const SETTLE_IN = 0.45;
const SETTLE_OUT = 0.92;
const BANK_IN = 0.6;
const BANK_OUT = 0.92;
const BANK_MAX = 1.4; // radians, the flying attitude; 0 is the edge-on presentation

/* Geometry, world units. Wing in local x-y, span x, chord y, biplane gap z. */
const HS = 4.5; // half span
const LEAD_Y = 1.7; // leading edge, top of the chord in local y
const TRAIL_Y = -1.7; // trailing edge
const UPPER_Z = 0.75; // wing nearest the camera at the presentation pose
const LOWER_Z = -0.75;
const RIBS = 14;
const STATIONS = [-4, -2, 0, 2, 4] as const;
const ANCHOR = new THREE.Vector3(64, 4.8, -6); // on the 0.465 view ray, wing fills frame

const root = new THREE.Group();
const tmpPos = new THREE.Vector3();
let airframe!: StrokeSetApi;
let ribs!: StrokeSetApi;

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

function wingOutline(z: number): THREE.Vector3[] {
  // a closed loop with a little sag so it reads hand-drawn, not stamped
  return poly([
    [-HS, TRAIL_Y, z],
    [-HS * 0.4, TRAIL_Y - 0.06, z],
    [HS * 0.4, TRAIL_Y - 0.06, z],
    [HS, TRAIL_Y, z],
    [HS, LEAD_Y, z],
    [HS * 0.4, LEAD_Y + 0.06, z],
    [-HS * 0.4, LEAD_Y + 0.06, z],
    [-HS, LEAD_Y, z],
    [-HS, TRAIL_Y, z],
  ]);
}

function buildAirframe(set: StrokeSetApi): void {
  set.addStroke(wingOutline(UPPER_Z));
  set.addStroke(wingOutline(LOWER_Z));

  // interplane struts at each span station, leading and trailing edges
  for (const x of STATIONS) {
    set.addStroke(poly([[x, LEAD_Y, LOWER_Z], [x, LEAD_Y, UPPER_Z]]));
    set.addStroke(poly([[x, TRAIL_Y, LOWER_Z], [x, TRAIL_Y, UPPER_Z]]));
  }

  // crossed bracing wires in two leading-edge bays
  for (const [xi, xj] of [[-4, -2], [2, 4]] as const) {
    set.addStroke(poly([[xi, LEAD_Y, LOWER_Z], [xj, LEAD_Y, UPPER_Z]]), { widthPx: 1.4 });
    set.addStroke(poly([[xj, LEAD_Y, LOWER_Z], [xi, LEAD_Y, UPPER_Z]]), { widthPx: 1.4 });
  }

  // front canard, a small biplane elevator ahead of the wing, plus its booms
  const canY = LEAD_Y + 1.6;
  set.addStroke(poly([[-1.4, canY, UPPER_Z], [1.4, canY, UPPER_Z]]));
  set.addStroke(poly([[-1.4, canY, LOWER_Z], [1.4, canY, LOWER_Z]]));
  set.addStroke(poly([[-1.1, LEAD_Y, 0], [-1.1, canY, 0]]), { widthPx: 1.6 });
  set.addStroke(poly([[1.1, LEAD_Y, 0], [1.1, canY, 0]]), { widthPx: 1.6 });

  // landing skids running fore and aft under the lower wing
  for (const x of [-1.0, 1.0]) {
    set.addStroke(
      poly([
        [x, TRAIL_Y - 0.3, LOWER_Z - 0.15],
        [x, 0, LOWER_Z - 0.2],
        [x, canY, LOWER_Z - 0.05],
      ]),
    );
  }

  // twin pusher props as ellipses in the x-z plane behind the trailing edge
  const propY = TRAIL_Y - 0.3;
  for (const cx of [-1.8, 1.8]) {
    const e: THREE.Vector3[] = [];
    for (let i = 0; i <= 20; i++) {
      const a = (i / 20) * Math.PI * 2;
      e.push(new THREE.Vector3(cx + Math.cos(a) * 0.9, propY, Math.sin(a) * 0.9));
    }
    set.addStroke(e, { widthPx: 1.8 });
  }
}

function buildRibs(set: StrokeSetApi): void {
  // about 14 chordwise ribs per wing, spaced along the span, drawn left to right
  for (const z of [UPPER_Z, LOWER_Z]) {
    for (let i = 0; i < RIBS; i++) {
      const x = mix(-HS * 0.93, HS * 0.93, i / (RIBS - 1));
      set.addStroke(
        poly([
          [x, TRAIL_Y, z],
          [x, 0, z + 0.12], // faint camber out of the wing plane
          [x, LEAD_Y, z],
        ]),
        { widthPx: 1.9 },
      );
    }
  }
}

export const flyerScene: FilmScene = {
  id: 'flyer',
  mount(ctx: FilmContext) {
    airframe = ctx.makeStrokeSet({ style: { widthPx: 2.4 }, maxPoints: 420 });
    ribs = ctx.makeStrokeSet({ style: { widthPx: 1.9 }, maxPoints: 280 });
    buildAirframe(airframe);
    buildRibs(ribs);
    root.add(airframe.object3d, ribs.object3d);
    ctx.three.scene.add(root);
  },

  update(local: number, _global: number, ctx: FilmContext) {
    airframe.setDraw(smoothstep(DRAW_AIR_IN, DRAW_AIR_OUT, local));
    ribs.setDraw(smoothstep(DRAW_RIB_IN, DRAW_RIB_OUT, local));

    // liftoff along a sliver of the takeoff arc, then ease into the frame anchor
    const climb = smoothstep(FLY_IN, CLIMB_OUT, local);
    arcFlyerPoint(climb * ARC_S_MAX, tmpPos);
    tmpPos.lerp(ANCHOR, smoothstep(SETTLE_IN, SETTLE_OUT, local));
    root.position.copy(tmpPos);

    // bank from the flying attitude to the edge-on presentation of the ribs
    const present = smoothstep(BANK_IN, BANK_OUT, local);
    root.rotation.set(mix(BANK_MAX, 0, present), 0, 0);

    const t = ctx.time();
    const cam = ctx.three.camera;
    const vp = ctx.viewport();
    airframe.update(t, cam, vp);
    ribs.update(t, cam, vp);
  },

  setVisible(v: boolean) {
    root.visible = v;
  },

  dispose() {
    airframe.dispose();
    ribs.dispose();
  },
};
