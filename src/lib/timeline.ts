/**
 * The scroll clock and the camera track. Lenis smooths the document scroll,
 * driven once per frame by the render loop through tick(); progress() reads the
 * current scroll as film t and smoothed() adds a frame-rate independent damp for
 * the camera. sampleCamera follows a C1 spline through the authored keys: holds
 * split the keys into segments, each a centripetal Catmull-Rom, timed linearly
 * in key t so no waypoint pauses exist and eased only where it meets a hold.
 */

import Lenis from 'lenis';
import * as THREE from 'three';
import { FILM } from '../film.config';
import { LOOK, type CameraKey } from './types';
import { arcPoint } from '../scenes/arc';

export interface TimelineApi {
  /** Raw film t in 0..1 from the current scroll over the film span. */
  progress(): number;
  /** Exponentially damped t for the camera, frame-rate independent. */
  smoothed(dtSec: number): number;
  /** Drive Lenis for this frame. Call once at the top of the render loop. */
  tick(nowMs: number): void;
  /** Jump the scroll to a given t. Used by the debug scrubber. */
  scrollToP(p: number): void;
  destroy(): void;
}

/** Damp rate for the camera track, per second. */
const SMOOTH_K = 10;

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

export function createTimeline(filmEl: HTMLElement): TimelineApi {
  // The browser's scroll restoration can fire after the deep-link jump and
  // silently win; the film owns its scroll position.
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let spanPx = Math.max(1, filmEl.offsetHeight - window.innerHeight);
  function measure(): void {
    spanPx = Math.max(1, filmEl.offsetHeight - window.innerHeight);
  }
  window.addEventListener('resize', measure);

  // Skip Lenis entirely under reduced motion; fall back to native scroll. Lenis
  // is driven by the render loop through tick(), not its own raf, so scroll and
  // render advance on one clock.
  let lenis: Lenis | null = null;
  if (!reduced) {
    lenis = new Lenis({ autoRaf: false, lerp: 0.1, smoothWheel: true });
  }

  function progress(): number {
    const pos = lenis ? lenis.scroll : window.scrollY;
    return clamp01(pos / spanPx);
  }

  let sm = progress();
  function smoothed(dtSec: number): number {
    const dt = dtSec < 0 ? 0 : dtSec > 0.1 ? 0.1 : dtSec;
    const alpha = 1 - Math.exp(-SMOOTH_K * dt);
    sm += (progress() - sm) * alpha;
    return sm;
  }

  function tick(nowMs: number): void {
    lenis?.raf(nowMs);
  }

  function scrollToP(p: number): void {
    const px = clamp01(p) * spanPx;
    if (lenis) lenis.scrollTo(px, { immediate: true, force: true });
    else window.scrollTo(0, px);
  }

  // Deep link ?t=0.42: scroll there on load, seeding the damp so the camera
  // does not glide in from the top. Lenis measures its limits on its own
  // schedule and can clamp an early scrollTo back to zero, so the jump is
  // applied immediately and re-applied across the first few frames until the
  // scroll position actually sticks.
  const tParam = new URLSearchParams(window.location.search).get('t');
  if (tParam !== null) {
    const t = parseFloat(tParam);
    if (!Number.isNaN(t)) {
      const target = clamp01(t);
      let tries = 0;
      const apply = (): void => {
        measure();
        scrollToP(target);
        sm = target;
        tries += 1;
        if (tries < 12 && Math.abs(progress() - target) > 0.002) {
          requestAnimationFrame(apply);
        }
      };
      apply();
    }
  }

  function destroy(): void {
    window.removeEventListener('resize', measure);
    lenis?.destroy();
  }

  return { progress, smoothed, tick, scrollToP, destroy };
}

/* ------------------------------------------------------------------ */
/* Camera track                                                        */
/* ------------------------------------------------------------------ */

const CAM = FILM.camera;

// Reused across frames; sampleCamera must not allocate.
const _pos = new THREE.Vector3();
const _tgt = new THREE.Vector3();
const _fwd = new THREE.Vector3();
const _up = new THREE.Vector3();
const _arc = new THREE.Vector3();
const _follow = new THREE.Vector3();

const DEG = Math.PI / 180;

/** The keys are staged to fill the frame vertically at this aspect. */
const REF_ASPECT = FILM.refAspect;
/** Cap on the vertical fov widening so portrait phones do not go fisheye. */
const MAX_WIDEN = 1.55;

// The hero apple fall, shared with the scene through FILM.fall.
const FALL_TIN = FILM.fall.tIn;
const FALL_THIT = FILM.fall.tHit;
const FALL_EASEPOW = FILM.fall.easePow;
const FALL_BLEND = FILM.fall.follow.blend;
const FALL_OFFSET = new THREE.Vector3(
  FILM.fall.follow.offset[0],
  FILM.fall.follow.offset[1],
  FILM.fall.follow.offset[2],
);

function smoothstep(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return t * t * (3 - 2 * t);
}

// Edge eases for the one inter-key interval that meets a hold or a film end.
// depart leaves stillness (zero velocity) and reaches unit slope so it flows
// into the linear middle without pausing the next waypoint; arrive mirrors it
// into stillness. A lone-interval segment eases both ways at once (smoothstep).
function departEase(x: number): number {
  return x * x * (2 - x);
}
function arriveEase(x: number): number {
  return x * (1 + x * (1 - x));
}

/** Uniform Catmull-Rom through four scalars, C1 continuous, passes the ends. */
function catmullScalar(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    0.5 *
    (2 * p1 + (p2 - p0) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (3 * p1 - p0 - 3 * p2 + p3) * t3)
  );
}

/** Sample a scalar keyframe array at fractional index x, ends clamped. */
function catmull1D(arr: number[], x: number): number {
  const n = arr.length;
  if (n === 1) return arr[0];
  let i = Math.floor(x);
  if (i < 0) i = 0;
  else if (i > n - 2) i = n - 2;
  const f = x - i;
  return catmullScalar(arr[i > 0 ? i - 1 : 0], arr[i], arr[i + 1], arr[i + 2 < n ? i + 2 : n - 1], f);
}

/** Follow weight 0..1 across the fall window: 1 in the core, eased at the edges. */
function fallFollow(p: number): number {
  if (p < FALL_TIN - FALL_BLEND || p > FALL_THIT + FALL_BLEND) return 0;
  if (p < FALL_TIN) return smoothstep((p - (FALL_TIN - FALL_BLEND)) / FALL_BLEND);
  if (p > FALL_THIT) return smoothstep((FALL_THIT + FALL_BLEND - p) / FALL_BLEND);
  return 1;
}

// The track as spans. A hold is two adjacent keys equal in pos and target (the
// camera is still across it); a transit is a bracket that jumps between world
// regions, kept off the spline as a straight lerp. Both split the remaining keys
// into moving segments, each a centripetal Catmull-Rom through its pos and target
// keys plus scalar keyframes for fov and roll, all built once.
interface Span {
  t0: number;
  t1: number;
  kind: 'hold' | 'transit' | 'segment';
  // hold: a constant pose across the span.
  hPos?: readonly [number, number, number];
  hTgt?: readonly [number, number, number];
  hFov?: number;
  hRoll?: number;
  // transit: a straight smoothstep lerp between two keys.
  aPos?: readonly [number, number, number];
  bPos?: readonly [number, number, number];
  aTgt?: readonly [number, number, number];
  bTgt?: readonly [number, number, number];
  aFov?: number;
  bFov?: number;
  aRoll?: number;
  bRoll?: number;
  // segment: the centripetal spline through the segment keys.
  posCurve?: THREE.CatmullRomCurve3;
  tgtCurve?: THREE.CatmullRomCurve3;
  fovArr?: number[];
  rollArr?: number[];
  tArr?: number[];
  /** Inter-key interval count (keys minus one). */
  segs?: number;
}

const HOLD_EPS = 1e-4;
function keysEqual(a: CameraKey, b: CameraKey): boolean {
  return (
    Math.abs(a.pos[0] - b.pos[0]) < HOLD_EPS &&
    Math.abs(a.pos[1] - b.pos[1]) < HOLD_EPS &&
    Math.abs(a.pos[2] - b.pos[2]) < HOLD_EPS &&
    Math.abs(a.target[0] - b.target[0]) < HOLD_EPS &&
    Math.abs(a.target[1] - b.target[1]) < HOLD_EPS &&
    Math.abs(a.target[2] - b.target[2]) < HOLD_EPS
  );
}

// An inter-region jump: a bracket whose position moves more than this many world
// units. It is kept off the spline so the catmull tangents of neighboring keys
// cannot bow the straight carry away from its matched scene motion.
const TRANSIT_DELTA_SQ = 25 * 25;
function posDeltaSq(a: CameraKey, b: CameraKey): number {
  const dx = a.pos[0] - b.pos[0];
  const dy = a.pos[1] - b.pos[1];
  const dz = a.pos[2] - b.pos[2];
  return dx * dx + dy * dy + dz * dz;
}

const SPANS: Span[] = (() => {
  const out: Span[] = [];
  const n = CAM.length;
  let i = 0;
  while (i < n - 1) {
    if (keysEqual(CAM[i], CAM[i + 1])) {
      const k = CAM[i];
      out.push({
        t0: k.t,
        t1: CAM[i + 1].t,
        kind: 'hold',
        hPos: k.pos,
        hTgt: k.target,
        hFov: k.fov ?? LOOK.fov,
        hRoll: k.roll ?? 0,
      });
      i += 1;
    } else if (posDeltaSq(CAM[i], CAM[i + 1]) > TRANSIT_DELTA_SQ) {
      const a = CAM[i];
      const b = CAM[i + 1];
      out.push({
        t0: a.t,
        t1: b.t,
        kind: 'transit',
        aPos: a.pos,
        bPos: b.pos,
        aTgt: a.target,
        bTgt: b.target,
        aFov: a.fov ?? LOOK.fov,
        bFov: b.fov ?? LOOK.fov,
        aRoll: a.roll ?? 0,
        bRoll: b.roll ?? 0,
      });
      i += 1;
    } else {
      const k0 = i;
      while (
        i < n - 1 &&
        !keysEqual(CAM[i], CAM[i + 1]) &&
        posDeltaSq(CAM[i], CAM[i + 1]) <= TRANSIT_DELTA_SQ
      ) {
        i += 1;
      }
      const k1 = i;
      const pts: THREE.Vector3[] = [];
      const tgts: THREE.Vector3[] = [];
      const fovArr: number[] = [];
      const rollArr: number[] = [];
      const tArr: number[] = [];
      for (let k = k0; k <= k1; k++) {
        pts.push(new THREE.Vector3(CAM[k].pos[0], CAM[k].pos[1], CAM[k].pos[2]));
        tgts.push(new THREE.Vector3(CAM[k].target[0], CAM[k].target[1], CAM[k].target[2]));
        fovArr.push(CAM[k].fov ?? LOOK.fov);
        rollArr.push(CAM[k].roll ?? 0);
        tArr.push(CAM[k].t);
      }
      out.push({
        t0: CAM[k0].t,
        t1: CAM[k1].t,
        kind: 'segment',
        posCurve: new THREE.CatmullRomCurve3(pts, false, 'centripetal'),
        tgtCurve: new THREE.CatmullRomCurve3(tgts, false, 'centripetal'),
        fovArr,
        rollArr,
        tArr,
        segs: k1 - k0,
      });
    }
  }
  return out;
})();

// Working pose, filled by the span sampler before the follow and aspect passes.
let _fov = LOOK.fov;
let _rollDeg = 0;

function sampleKeyed(p: number): void {
  let span = SPANS[0];
  const last = SPANS[SPANS.length - 1];
  if (p >= last.t1) span = last;
  else if (p > SPANS[0].t0) {
    for (let s = 0; s < SPANS.length; s++) {
      if (p >= SPANS[s].t0 && p <= SPANS[s].t1) {
        span = SPANS[s];
        break;
      }
    }
  }

  if (span.kind === 'hold') {
    const pos = span.hPos!;
    const tgt = span.hTgt!;
    _pos.set(pos[0], pos[1], pos[2]);
    _tgt.set(tgt[0], tgt[1], tgt[2]);
    _fov = span.hFov!;
    _rollDeg = span.hRoll!;
    return;
  }

  if (span.kind === 'transit') {
    // Straight smoothstep lerp, matched to the scene's own carry. Zero velocity
    // at both ends hands off cleanly to the flanking hold and eased segment.
    const s = smoothstep((p - span.t0) / (span.t1 - span.t0));
    const ap = span.aPos!;
    const bp = span.bPos!;
    const at = span.aTgt!;
    const bt = span.bTgt!;
    _pos.set(ap[0] + (bp[0] - ap[0]) * s, ap[1] + (bp[1] - ap[1]) * s, ap[2] + (bp[2] - ap[2]) * s);
    _tgt.set(at[0] + (bt[0] - at[0]) * s, at[1] + (bt[1] - at[1]) * s, at[2] + (bt[2] - at[2]) * s);
    _fov = span.aFov! + (span.bFov! - span.aFov!) * s;
    _rollDeg = span.aRoll! + (span.bRoll! - span.aRoll!) * s;
    return;
  }

  const tArr = span.tArr!;
  const J = span.segs!;
  const pc = p < span.t0 ? span.t0 : p > span.t1 ? span.t1 : p;
  let j = J - 1;
  for (let idx = 0; idx < J; idx++) {
    if (pc <= tArr[idx + 1]) {
      j = idx;
      break;
    }
  }
  const dt = tArr[j + 1] - tArr[j];
  let frac = dt > 0 ? (pc - tArr[j]) / dt : 0;
  // Segments are always bounded by holds, transits, or the film ends; ease the
  // first and last intervals into and out of stillness, leave the interior
  // linear so no interior waypoint pauses.
  if (J === 1) frac = smoothstep(frac);
  else if (j === 0) frac = departEase(frac);
  else if (j === J - 1) frac = arriveEase(frac);
  const x = j + frac;
  span.posCurve!.getPoint(x / J, _pos);
  span.tgtCurve!.getPoint(x / J, _tgt);
  _fov = catmull1D(span.fovArr!, x);
  _rollDeg = catmull1D(span.rollArr!, x);
}

/**
 * Place the camera at film t. The keyed pose comes from the spline (still at
 * holds); the aspect compensation widens fov on narrow viewports; the FILM.fall
 * follow lerps the pose toward the apple; then roll rotates the world up around
 * the view axis so lookAt banks the horizon.
 */
export function sampleCamera(p: number, camera: THREE.PerspectiveCamera): void {
  sampleKeyed(p);
  const keyedFov = _fov;
  let rollDeg = _rollDeg;

  // Aspect compensation. Below the reference aspect the viewport is narrower
  // than the keys assumed, so widen the vertical fov to keep the same
  // horizontal span in frame; cap the widening so portrait phones do not go
  // fisheye. At or above the reference, keep the keyed fov and let wide screens
  // take the extra span as lateral air.
  const aspect = camera.aspect;
  let fov = keyedFov;
  if (aspect < REF_ASPECT) {
    const widened = (2 * Math.atan((Math.tan((keyedFov * DEG) / 2) * REF_ASPECT) / aspect)) / DEG;
    const cap = keyedFov * MAX_WIDEN;
    fov = widened < cap ? widened : cap;
  }

  // Hero apple follow. Inside the fall window the camera tracks the apple dead
  // centered: its target rides the shared arc and its position sits at that
  // target plus a fixed offset. Across the blend margins it lerps between the
  // keyed pose and the follow pose. Fov stays keyed, so the aspect compensation
  // above still holds; roll eases to zero as the follow takes over.
  const follow = fallFollow(p);
  if (follow > 0) {
    const sLin = clamp01((p - FALL_TIN) / (FALL_THIT - FALL_TIN));
    const sFall = Math.pow(sLin, FALL_EASEPOW);
    // arcPoint already returns newton-region world coords, so it is used
    // directly with no region offset added.
    arcPoint(sFall, _arc);
    _follow.copy(_arc).add(FALL_OFFSET);
    _pos.lerp(_follow, follow);
    _tgt.lerp(_arc, follow);
    rollDeg *= 1 - follow;
  }

  const roll = rollDeg * DEG;

  _fwd.copy(_tgt).sub(_pos);
  if (_fwd.lengthSq() < 1e-12) _fwd.set(0, 0, -1);
  else _fwd.normalize();

  _up.set(0, 1, 0).applyAxisAngle(_fwd, roll);

  camera.position.copy(_pos);
  camera.up.copy(_up);
  camera.lookAt(_tgt);

  if (Math.abs(camera.fov - fov) > 1e-4) {
    camera.fov = fov;
    camera.updateProjectionMatrix();
  }
}
