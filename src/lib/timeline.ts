/**
 * The scroll clock. Lenis smooths the document scroll; progress() reads the
 * current scroll as film t, and smoothed() adds a frame-rate independent damp
 * on top for the camera. sampleCamera interpolates the authored camera keys,
 * rolling the up vector around the view axis.
 */

import Lenis from 'lenis';
import * as THREE from 'three';
import { FILM } from '../film.config';
import { LOOK } from './types';
import { arcPoint } from '../scenes/arc';

export interface TimelineApi {
  /** Raw film t in 0..1 from the current scroll over the film span. */
  progress(): number;
  /** Exponentially damped t for the camera, frame-rate independent. */
  smoothed(dtSec: number): number;
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

  // Skip Lenis entirely under reduced motion; fall back to native scroll.
  let lenis: Lenis | null = null;
  if (!reduced) {
    lenis = new Lenis({ autoRaf: true, lerp: 0.1, smoothWheel: true });
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

  return { progress, smoothed, scrollToP, destroy };
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
const _tmp = new THREE.Vector3();
const _arc = new THREE.Vector3();
const _follow = new THREE.Vector3();

const DEG = Math.PI / 180;

/** The keys are staged to fill the frame vertically at this aspect. */
const REF_ASPECT = FILM.refAspect;
/** Cap on the vertical fov widening so portrait phones do not go fisheye. */
const MAX_WIDEN = 1.55;

// The hero apple fall, shared with the scene through FILM.fall. During the
// window the camera follows the apple; see sampleCamera.
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

/** Follow weight 0..1 across the fall window: 1 in the core, eased at the edges. */
function fallFollow(p: number): number {
  if (p < FALL_TIN - FALL_BLEND || p > FALL_THIT + FALL_BLEND) return 0;
  if (p < FALL_TIN) return smoothstep((p - (FALL_TIN - FALL_BLEND)) / FALL_BLEND);
  if (p > FALL_THIT) return smoothstep((FALL_THIT + FALL_BLEND - p) / FALL_BLEND);
  return 1;
}

/**
 * Place the camera at film t by interpolating FILM.camera. Position, target,
 * fov, and roll are eased with smoothstep inside each key bracket. Roll rotates
 * the world up around the view axis, so lookAt banks the horizon. Inside the
 * FILM.fall window the camera hands off to a follow rig locked to the apple,
 * blended in and out at the edges.
 */
export function sampleCamera(p: number, camera: THREE.PerspectiveCamera): void {
  const n = CAM.length;
  let a = CAM[0];
  let b = CAM[0];
  let s = 0;
  if (p <= CAM[0].t) {
    a = b = CAM[0];
  } else if (p >= CAM[n - 1].t) {
    a = b = CAM[n - 1];
  } else {
    for (let i = 0; i < n - 1; i++) {
      if (p >= CAM[i].t && p <= CAM[i + 1].t) {
        a = CAM[i];
        b = CAM[i + 1];
        const span = b.t - a.t;
        s = span > 0 ? smoothstep((p - a.t) / span) : 0;
        break;
      }
    }
  }

  _pos.set(a.pos[0], a.pos[1], a.pos[2]);
  _tmp.set(b.pos[0], b.pos[1], b.pos[2]);
  _pos.lerp(_tmp, s);

  _tgt.set(a.target[0], a.target[1], a.target[2]);
  _tmp.set(b.target[0], b.target[1], b.target[2]);
  _tgt.lerp(_tmp, s);

  const fovA = a.fov ?? LOOK.fov;
  const fovB = b.fov ?? LOOK.fov;
  const keyedFov = fovA + (fovB - fovA) * s;

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

  const rollA = a.roll ?? 0;
  const rollB = b.roll ?? 0;
  let rollDeg = rollA + (rollB - rollA) * s;

  // Hero apple follow. Inside the fall window the camera tracks the apple dead
  // centered: its target rides the shared arc and its position sits at that
  // target plus a fixed offset. Across the blend margins at each edge it lerps
  // between the keyed camera and the follow camera so entry and exit are
  // seamless. Fov stays keyed, so the aspect compensation above still holds;
  // roll eases to zero as the follow takes over.
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
