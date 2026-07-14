/** Stub. scenes-rough replaces this file per SPEC.md. */

import * as THREE from 'three';
import type { FilmContext, FilmScene } from '../lib/types';

const group = new THREE.Group();

export const bootScene: FilmScene = {
  id: 'boot',
  mount(ctx: FilmContext) {
    ctx.three.scene.add(group);
  },
  update() {},
  setVisible(v: boolean) {
    group.visible = v;
  },
  dispose() {},
};
