/** Stub. render-core replaces this file per SPEC.md. */

import type * as THREE from 'three';
import type { LookParams, PostApi } from '../lib/types';

export function createPost(
  _renderer: THREE.WebGLRenderer,
  _scene: THREE.Scene,
  _camera: THREE.PerspectiveCamera,
  _look: LookParams,
): PostApi {
  throw new Error('post.ts is a stub; render-core implements it');
}
