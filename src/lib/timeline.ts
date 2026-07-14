/** Stub. film-runtime replaces this file per SPEC.md. */

import type * as THREE from 'three';

export interface TimelineApi {
  progress(): number;
  smoothed(dtSec: number): number;
  destroy(): void;
}

export function createTimeline(_filmEl: HTMLElement): TimelineApi {
  throw new Error('timeline.ts is a stub; film-runtime implements it');
}

export function sampleCamera(_p: number, _camera: THREE.PerspectiveCamera): void {
  throw new Error('timeline.ts is a stub; film-runtime implements it');
}
