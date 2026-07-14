/**
 * Link 2: the 1903 Flyer, drawn as chalk, crossing the sky behind the Newton
 * frame while the camera chases and closes onto it.
 *
 * There is no slide cut any more. The plane's world position is interpolated
 * from FILM.flythrough by global t, and the camera keys are staged against the
 * same rows, so the chase stays framed. Interpolation is piecewise linear on
 * purpose: the 0.465 camera target equals a linear sample of the rows there, so
 * linear keeps the wing centred at the presentation, where a smoothstepped
 * sample would lead the aim and push the wing off frame.
 *
 * Geometry is built once at mount in a presentation-native local frame: the wing
 * lives in the local x-y plane, span along x, ribs running along y (the chord),
 * biplane gap along z. Flying, the plane holds a level attitude with its nose on
 * the path tangent. Into the presentation it banks so the upper wing turns to
 * the 0.465 camera and its ribs read as a row of parallel ridges filling the
 * frame, matched to the boot tread at 0.475. The plane sits close and large
 * there, so the ribs are pitched fine enough that a dozen still fill the frame.
 */

import * as THREE from 'three';
import type { FilmContext, FilmScene, StrokeSetApi } from '../lib/types';
import { FILM } from '../film.config';

/* Timing, all in global t. */
const DRAW_IN = 0.295; // fully drawn while still tiny in the background
const DRAW_OUT = 0.31;
const BANK_IN = 0.42; // the plane flies level until here, then turns to present
const BANK_OUT = 0.465;
const PRESENT_T = 0.465; // the rib presentation camera key this pose is built from

/* Geometry, world units. Wing in local x-y, span x, chord y, biplane gap z. */
const HS = 4.5; // half span
const LEAD_Y = 1.7; // leading edge, top of the chord in local y
const TRAIL_Y = -1.7; // trailing edge
const UPPER_Z = 0.75; // wing nearest the camera at the presentation pose
const LOWER_Z = -0.75;
const RIBS = 48; // fine pitch so a dozen fill the close presentation frame
const RIB_BOIL_SEED = 7; // the dense ribs share one boil phase, re-registering as a unit
const STATIONS = [-4, -2, 0, 2, 4] as const;

const FT = FILM.flythrough;
const WORLD_UP = new THREE.Vector3(0, 1, 0);

const root = new THREE.Group();
// preallocated scratch, so update never allocates
const _pos = new THREE.Vector3();
const _tan = new THREE.Vector3();
const _spanAxis = new THREE.Vector3();
const _upAxis = new THREE.Vector3();
const _mat = new THREE.Matrix4();
const _qFly = new THREE.Quaternion();
const _qOut = new THREE.Quaternion();
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

/** The banked pose that turns the upper wing to the presentation camera. */
const Q_PRESENT = (() => {
  const key = FILM.camera.find((k) => Math.abs(k.t - PRESENT_T) < 1e-6);
  const pos = key ? key.pos : [29.6, 6.7, 3.0];
  const tgt = key ? key.target : [31.8, 6.5, -0.2];
  const rollDeg = key && key.roll !== undefined ? key.roll : 78;
  const d = new THREE.Vector3(tgt[0] - pos[0], tgt[1] - pos[1], tgt[2] - pos[2]).normalize();
  const right0 = new THREE.Vector3().crossVectors(d, WORLD_UP).normalize();
  const up0 = new THREE.Vector3().crossVectors(right0, d).normalize();
  const roll = (rollDeg * Math.PI) / 180;
  const cr = Math.cos(roll);
  const sr = Math.sin(roll);
  // camera up and right after the roll; the wing span aligns to screen up so the
  // ribs stack vertically and run horizontally, the same read as the boot tread
  const screenUp = up0.clone().multiplyScalar(cr).addScaledVector(right0, sr).normalize();
  const screenRight = right0.clone().multiplyScalar(cr).addScaledVector(up0, -sr).normalize();
  const zAxis = new THREE.Vector3().crossVectors(screenUp, screenRight).normalize();
  const m = new THREE.Matrix4().makeBasis(screenUp, screenRight, zAxis);
  return new THREE.Quaternion().setFromRotationMatrix(m);
})();

/** Plane world position, piecewise linear across the flythrough rows by t. */
function flythroughPos(g: number, out: THREE.Vector3): void {
  const n = FT.length;
  const first = FT[0];
  const last = FT[n - 1];
  if (g <= first[0]) {
    out.set(first[1], first[2], first[3]);
    return;
  }
  if (g >= last[0]) {
    out.set(last[1], last[2], last[3]);
    return;
  }
  for (let i = 0; i < n - 1; i++) {
    const a = FT[i];
    const b = FT[i + 1];
    if (g <= b[0]) {
      const f = (g - a[0]) / (b[0] - a[0]);
      out.set(mix(a[1], b[1], f), mix(a[2], b[2], f), mix(a[3], b[3], f));
      return;
    }
  }
  out.set(last[1], last[2], last[3]);
}

/** Travel direction of the active flythrough segment, normalized. */
function flythroughTangent(g: number, out: THREE.Vector3): void {
  const n = FT.length;
  let i = 0;
  if (g >= FT[n - 1][0]) {
    i = n - 2;
  } else {
    for (let k = 0; k < n - 1; k++) {
      if (g <= FT[k + 1][0]) {
        i = k;
        break;
      }
    }
  }
  const a = FT[i];
  const b = FT[i + 1];
  out.set(b[1] - a[1], b[2] - a[2], b[3] - a[3]).normalize();
}

/** Level flying attitude: nose on the tangent, span horizontal, gap up. */
function buildFlyQuat(f: THREE.Vector3, out: THREE.Quaternion): void {
  _spanAxis.crossVectors(f, WORLD_UP).normalize();
  _upAxis.crossVectors(_spanAxis, f).normalize();
  _mat.makeBasis(_spanAxis, f, _upAxis);
  out.setFromRotationMatrix(_mat);
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
  // a dense row of chordwise ribs on the upper wing, drawn tip to tip; at the
  // 0.465 presentation the span runs vertically, so this reads as a row of
  // parallel ridges filling the frame, matched to the boot tread at 0.475
  for (let i = 0; i < RIBS; i++) {
    const x = mix(-HS * 0.95, HS * 0.95, i / (RIBS - 1));
    set.addStroke(
      poly([
        [x, TRAIL_Y, UPPER_Z],
        [x, 0, UPPER_Z + 0.1], // faint camber out of the wing plane
        [x, LEAD_Y, UPPER_Z],
      ]),
      { widthPx: 1.9, boilSeed: RIB_BOIL_SEED },
    );
  }
}

export const flyerScene: FilmScene = {
  id: 'flyer',
  mount(ctx: FilmContext) {
    airframe = ctx.makeStrokeSet({ style: { widthPx: 2.4 }, maxPoints: 420 });
    ribs = ctx.makeStrokeSet({ style: { widthPx: 1.9 }, maxPoints: 240 });
    buildAirframe(airframe);
    buildRibs(ribs);
    root.add(airframe.object3d, ribs.object3d);
    ctx.three.scene.add(root);
  },

  update(_local: number, global: number, ctx: FilmContext) {
    const draw = smoothstep(DRAW_IN, DRAW_OUT, global);
    airframe.setDraw(draw);
    ribs.setDraw(draw);

    // cross the sky along the flythrough rows
    flythroughPos(global, _pos);
    root.position.copy(_pos);

    // hold a level attitude on the tangent, then bank into the rib presentation
    flythroughTangent(global, _tan);
    buildFlyQuat(_tan, _qFly);
    const present = smoothstep(BANK_IN, BANK_OUT, global);
    _qOut.copy(_qFly).slerp(Q_PRESENT, present);
    root.quaternion.copy(_qOut);

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
