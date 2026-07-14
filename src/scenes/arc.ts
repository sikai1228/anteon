/**
 * The one parabola behind both match-cut arcs. The apple falls along
 * arcPoint; the Flyer takes off along arcFlyerPoint, which is the same
 * curve reversed, scaled, and moved into the flyer region.
 */

import * as THREE from 'three';
import { FILM, REGIONS } from '../film.config';

const start = new THREE.Vector3(...FILM.arc.start);
const apex = new THREE.Vector3(...FILM.arc.apex);
const end = new THREE.Vector3(...FILM.arc.end);

const tmpA = new THREE.Vector3();
const tmpB = new THREE.Vector3();

/** Quadratic bezier through start, apex, end. s in [0..1], 0 = release. */
export function arcPoint(s: number, out = new THREE.Vector3()): THREE.Vector3 {
  tmpA.lerpVectors(start, apex, s);
  tmpB.lerpVectors(apex, end, s);
  return out.lerpVectors(tmpA, tmpB, s);
}

/**
 * The takeoff arc: s 0 = ground roll start, 1 = climbing out.
 * Reversal of the fall, scaled by flyerScale, based at the flyer region.
 */
export function arcFlyerPoint(s: number, out = new THREE.Vector3()): THREE.Vector3 {
  arcPoint(1 - s, out);
  out.sub(end);
  out.multiplyScalar(FILM.arc.flyerScale);
  out.x = REGIONS.flyer + out.x;
  out.y += FILM.arc.flyerLift;
  return out;
}

/** Tangent along the fall arc, for orienting the apple and the Flyer. */
export function arcTangent(s: number, out = new THREE.Vector3()): THREE.Vector3 {
  const e = 0.001;
  const a = arcPoint(Math.max(0, s - e), tmpA).clone();
  arcPoint(Math.min(1, s + e), out);
  return out.sub(a).normalize();
}
