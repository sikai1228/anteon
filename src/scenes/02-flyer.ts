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
 * biplane gap along z. Crossing, the plane holds a lightly banked attitude with
 * its nose on the path tangent, tipped toward the chase camera so it reads as an
 * upper three-quarter view rather than the flat underside. The ribs are the
 * match-cut payload, so they stay undrawn through the crossing and draw in only
 * as the camera closes: the distant plane is a clean silhouette and the ridge row
 * arrives just before the presentation. Into the presentation the plane banks so
 * the upper wing turns to the 0.465 camera and its ribs read as a row of parallel
 * ridges filling the frame, matched to the boot tread at 0.475. It sits close and
 * large there, so the ribs are pitched fine enough that a dozen still fill it.
 *
 * Both sets depth-test against the scene, so the newton tree's invisible depth
 * occluder hides the plane where it crosses the crown rather than tangling with
 * the canopy strokes. The plane's position and the presentation pose are read
 * from FILM.flythrough and the 0.465 camera key, so retimed rows need no edit.
 *
 * The handoff to the boot: the frame locks at the presentation (camera held 0.465
 * to 0.487, plane frozen and settled onto the camera aim so the ridge field owns
 * the centre). The boot scene owns the single boot and draws its own sole and
 * tread over the held ribs; this scene then fades every set to zero across 0.479
 * to 0.4855, so the ribs dissolve and the boot's tread is what remains. There is
 * no cutout or occluder here any more.
 */

import * as THREE from 'three';
import type { FilmContext, FilmScene, StrokeSetApi } from '../lib/types';
import { FILM } from '../film.config';

/* Timing, all in global t. */
const DRAW_IN = 0.28; // fully drawn off-frame, so it flies in already whole
const DRAW_OUT = 0.29;
const BANK_IN = 0.4; // the plane holds the crossing attitude until here, then presents
const BANK_OUT = 0.458; // fully presented BEFORE the camera arrives: no content snap
const PRESENT_T = 0.465; // the rib presentation camera key this pose is built from
const RIB_DRAW_IN = 0.42; // ribs held back through the crossing, drawn as the camera closes
const RIB_DRAW_OUT = 0.45;
const CROSS_BANK = (11 * Math.PI) / 180; // bank toward the camera for an upper three-quarter read
const CROSS_COS = Math.cos(CROSS_BANK);
const CROSS_SIN = Math.sin(CROSS_BANK);

/* Geometry, world units. Wing in local x-y, span x, chord y, biplane gap z. */
const HS = 4.5; // half span
const LEAD_Y = 1.7; // leading edge, top of the chord in local y
const TRAIL_Y = -1.7; // trailing edge
const UPPER_Z = 0.75; // wing nearest the camera at the presentation pose
const LOWER_Z = -0.75;
const RIBS = 48; // fine pitch so a dozen fill the close presentation frame
const RIB_BOIL_SEED = 7; // the dense ribs share one boil phase, re-registering as a unit
const RIB_Z = LOWER_Z; // the model flip maps this to the visually upper wing
const STATIONS = [-4, -2, 0, 2, 4] as const;

/* Presentation and handoff, all in global t. The frame is locked 0.465 to 0.487.
 * The handoff is an INSTANT step, not a fade: at SWAP_T the whole plane
 * vanishes in the same frame the boot's inherited, cropped ribs remain, so the
 * viewer sees the existing lines simply lose everything outside the sole. The
 * constant must equal SWAP_T in 03-boot.ts. */
const SETTLE_IN = 0.448; // the glide onto the camera aim starts here
const SETTLE_OUT = 0.462; // and is finished before the camera stops moving
const SWAP_T = 0.4795;

const FT = FILM.flythrough;
const TAN_DELTA = 0.001; // curve-u delta for the finite-difference tangent
const WORLD_UP = new THREE.Vector3(0, 1, 0);

const root = new THREE.Group();
// preallocated scratch, so update never allocates
const _pos = new THREE.Vector3();
const _tan = new THREE.Vector3();
const _tanA = new THREE.Vector3();
const _spanAxis = new THREE.Vector3();
const _upAxis = new THREE.Vector3();
const _rSpan = new THREE.Vector3();
const _rUp = new THREE.Vector3();
const _mat = new THREE.Matrix4();
const _qFly = new THREE.Quaternion();
const _qOut = new THREE.Quaternion();
let curve!: THREE.CatmullRomCurve3;
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

/** The presentation camera aim, where the frozen plane settles to own the frame. */
const PRESENT_AIM = (() => {
  const key = FILM.camera.find((k) => Math.abs(k.t - PRESENT_T) < 1e-6);
  const t = key ? key.target : [31.8, 11.85, -0.2];
  return new THREE.Vector3(t[0], t[1], t[2]);
})();

/**
 * Map global t to curve parameter u in [0..1], piecewise linear through the row
 * t values, so the plane reaches each row at its authored time while the curve
 * itself stays smooth with no per-bracket velocity kink.
 */
function tToU(g: number): number {
  const n = FT.length;
  if (g <= FT[0][0]) return 0;
  if (g >= FT[n - 1][0]) return 1;
  for (let i = 0; i < n - 1; i++) {
    if (g <= FT[i + 1][0]) {
      const f = (g - FT[i][0]) / (FT[i + 1][0] - FT[i][0]);
      return (i + f) / (n - 1);
    }
  }
  return 1;
}

/** Crossing attitude: nose on the tangent, banked a few degrees toward the camera. */
function buildFlyQuat(f: THREE.Vector3, out: THREE.Quaternion): void {
  _spanAxis.crossVectors(f, WORLD_UP).normalize();
  _upAxis.crossVectors(_spanAxis, f).normalize();
  // bank about the nose so the near wing lifts: the chase camera sits below and
  // off the wingtip, so this shows the upper three-quarter rather than the belly
  _rSpan.copy(_spanAxis).multiplyScalar(CROSS_COS).addScaledVector(_upAxis, -CROSS_SIN);
  _rUp.copy(_spanAxis).multiplyScalar(CROSS_SIN).addScaledVector(_upAxis, CROSS_COS);
  _mat.makeBasis(_rSpan, f, _rUp);
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

  // front canard, a small biplane elevator ahead of the wing, plus its
  // booms; the model flip makes this the visual TAIL in flight, so it
  // carries full presence rather than thinning out
  const canY = LEAD_Y + 1.6;
  set.addStroke(poly([[-1.4, canY, UPPER_Z], [1.4, canY, UPPER_Z]]), { widthPx: 2.6 });
  set.addStroke(poly([[-1.4, canY, LOWER_Z], [1.4, canY, LOWER_Z]]), { widthPx: 2.6 });
  set.addStroke(poly([[-1.1, LEAD_Y, 0], [-1.1, canY, 0]]), { widthPx: 2.2 });
  set.addStroke(poly([[1.1, LEAD_Y, 0], [1.1, canY, 0]]), { widthPx: 2.2 });

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
  // the rib row lives on the top wing (LOWER_Z here because the model group
  // flips about its span; the flip maps it to the visually upper wing). The
  // ribs are dead straight: zero wobble and zero camber, so the boot's
  // inherited tread can coincide with them exactly across the swap.
  for (let i = 0; i < RIBS; i++) {
    const x = mix(-HS * 0.95, HS * 0.95, i / (RIBS - 1));
    set.addStroke(
      poly([
        [x, TRAIL_Y, RIB_Z],
        [x, 0, RIB_Z],
        [x, LEAD_Y, RIB_Z],
      ]),
      { widthPx: 1.9, boilSeed: RIB_BOIL_SEED },
    );
  }
}

export const flyerScene: FilmScene = {
  id: 'flyer',
  mount(ctx: FilmContext) {
    // one smooth centripetal curve through the flythrough rows, sampled by t,
    // so the crossing has no velocity kink at the row boundaries
    const pts: THREE.Vector3[] = [];
    for (const r of FT) pts.push(new THREE.Vector3(r[1], r[2], r[3]));
    curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');

    // depthTest on both sets: the newton tree's invisible occluder hides the
    // plane where it crosses the crown instead of tangling with canopy strokes
    airframe = ctx.makeStrokeSet({ style: { widthPx: 2.4, depthTest: true }, maxPoints: 420 });
    ribs = ctx.makeStrokeSet({ style: { widthPx: 1.9, depthTest: true, wobbleAmp: 0 }, maxPoints: 240 });
    buildAirframe(airframe);
    buildRibs(ribs);
    // user direction: the prop circles lead toward the flight direction and
    // the canard extension trails, so the whole model flips about its span
    const model = new THREE.Group();
    model.rotation.x = Math.PI;
    model.add(airframe.object3d, ribs.object3d);
    root.add(model);
    ctx.three.scene.add(root);
  },

  update(_local: number, global: number, ctx: FilmContext) {
    airframe.setDraw(smoothstep(DRAW_IN, DRAW_OUT, global));
    // the ribs are the match-cut payload, held back through the crossing so the
    // distant plane stays a clean silhouette, then drawn in as the camera closes
    ribs.setDraw(smoothstep(RIB_DRAW_IN, RIB_DRAW_OUT, global));

    // cross the sky along one smooth curve; at the lock the plane freezes and
    // settles onto the camera aim so the held ridge field owns the frame centre
    const gPath = global < PRESENT_T ? global : PRESENT_T;
    const u = tToU(gPath);
    curve.getPoint(u, _pos);
    _pos.lerp(PRESENT_AIM, smoothstep(SETTLE_IN, SETTLE_OUT, global));
    root.position.copy(_pos);

    // tangent by finite difference on the curve, no allocation
    const u1 = u - TAN_DELTA < 0 ? 0 : u - TAN_DELTA;
    const u2 = u + TAN_DELTA > 1 ? 1 : u + TAN_DELTA;
    curve.getPoint(u2, _tan);
    curve.getPoint(u1, _tanA);
    _tan.sub(_tanA).normalize();

    // hold the banked crossing attitude on the tangent, then turn to present
    buildFlyQuat(_tan, _qFly);
    const present = smoothstep(BANK_IN, BANK_OUT, global);
    _qOut.copy(_qFly).slerp(Q_PRESENT, present);
    root.quaternion.copy(_qOut);

    // the boot scene draws its own sole and tread over the held ribs; here every
    // the instant handoff: the whole plane vanishes in one step at SWAP_T, the
    // same frame the boot's inherited cropped ribs remain
    const on = global < SWAP_T ? 1 : 0;
    airframe.setOpacity(on);
    ribs.setOpacity(on);

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
