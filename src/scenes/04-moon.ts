/**
 * Link 4: the lunar surface, a distant suited figure, and the flag.
 *
 * Terrain and figure are sparse chalk on black. The flag is the only colour in
 * the whole film: its cloth strokes carry flagRed and flagBlue on a colorBypass
 * set, everything else stays chalk white. The flag rises around global 0.68 by
 * drawing on upward while the cloth group lifts; its wave is left to the baked
 * stroke wobble and the boil, not animated here. After 0.78 the camera pushes in
 * and the DOM fade takes the frame, so the scene just keeps the cloth drawn.
 */

import * as THREE from 'three';
import type { FilmContext, FilmScene, StrokeSetApi } from '../lib/types';
import { REGIONS } from '../film.config';

/* Timing, all in local 0..1. Global 0.5 is local 0, global 0.87 is local 1. */
const DRAW_TERRAIN_OUT = 0.22; // lunar wide reveal, global 0.5 to 0.58
const FIG_IN = 0.14;
const FIG_OUT = 0.28;
const POLE_IN = 0.4;
const POLE_OUT = 0.5; // planted just before the cloth rises, global 0.65
const CLOTH_DRAW_IN = 0.44;
const CLOTH_DRAW_OUT = 0.64;
const LIFT_IN = 0.44;
const LIFT_OUT = 0.62; // cloth fully up by global 0.73
const CLOTH_LIFT = 0.9; // how far below its rest the cloth starts

/* Placement in local space, added to the region x. */
const FIG_POS = new THREE.Vector3(6, 0, -6); // world 186, from behind, tiny
const FLAG_X = 3; // world 183
const POLE_TOP = 2.2;

const root = new THREE.Group();
const figureGroup = new THREE.Group();
const clothGroup = new THREE.Group();
let terrain!: StrokeSetApi;
let figure!: StrokeSetApi;
let pole!: StrokeSetApi;
let cloth!: StrokeSetApi;

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
function ellipseXZ(cx: number, cz: number, rx: number, rz: number, y: number): THREE.Vector3[] {
  const out: THREE.Vector3[] = [];
  for (let i = 0; i <= 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    out.push(new THREE.Vector3(cx + Math.cos(a) * rx, y, cz + Math.sin(a) * rz));
  }
  return out;
}

function buildTerrain(set: StrokeSetApi): void {
  // one long, low horizon that draws first
  const horizon: THREE.Vector3[] = [];
  for (let i = 0; i <= 22; i++) {
    const x = mix(-8, 12, i / 22);
    horizon.push(new THREE.Vector3(x, 0.1 + Math.sin(i * 0.7) * 0.18, -10));
  }
  set.addStroke(horizon, { widthPx: 2.2 });

  // craters, flattened along z so they read at a grazing angle from the low camera
  const rng = makeRng(7);
  for (let i = 0; i < 10; i++) {
    const cx = mix(-6, 10, rng());
    const cz = mix(-8, 1.5, rng());
    const rx = 0.5 + rng() * 0.8;
    set.addStroke(ellipseXZ(cx, cz, rx, rx * (0.3 + rng() * 0.2), 0.01), { widthPx: 1.6 });
  }

  // scattered rock ticks
  for (let i = 0; i < 24; i++) {
    const bx = mix(-7, 11, rng());
    const bz = mix(-9, 2, rng());
    const a = rng() * Math.PI;
    const len = 0.1 + rng() * 0.2;
    set.addStroke(
      poly([
        [bx, 0.02, bz],
        [bx + Math.cos(a) * len, 0.02 + rng() * 0.12, bz + Math.sin(a) * len],
      ]),
      { widthPx: 1.4 },
    );
  }
}

function buildFigure(set: StrokeSetApi): void {
  // a small suited figure seen from behind, backpack toward us, no face
  const circle: THREE.Vector3[] = [];
  for (let i = 0; i <= 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    circle.push(new THREE.Vector3(Math.cos(a) * 0.16, 1.12 + Math.sin(a) * 0.16, 0));
  }
  set.addStroke(circle, { widthPx: 1.8 }); // helmet
  set.addStroke(
    poly([
      [-0.15, 0.5, -0.02],
      [0.15, 0.5, -0.02],
      [0.15, 1.0, -0.02],
      [-0.15, 1.0, -0.02],
      [-0.15, 0.5, -0.02],
    ]),
    { widthPx: 1.8 },
  ); // backpack
  set.addStroke(
    poly([
      [-0.28, 0.6, 0],
      [-0.24, 0.98, 0],
      [0.24, 0.98, 0],
      [0.28, 0.6, 0],
    ]),
    { widthPx: 1.7 },
  ); // shoulders and arms
  set.addStroke(poly([[-0.14, 0.55, 0], [-0.13, 0.05, 0]]), { widthPx: 1.9 }); // left leg
  set.addStroke(poly([[0.14, 0.55, 0], [0.13, 0.05, 0]]), { widthPx: 1.9 }); // right leg
}

function buildPole(set: StrokeSetApi): void {
  set.addStroke(poly([[FLAG_X, 0, 0], [FLAG_X + 0.03, POLE_TOP * 0.5, 0], [FLAG_X + 0.06, POLE_TOP, 0]]), {
    widthPx: 2.2,
  });
  set.addStroke(poly([[FLAG_X + 0.06, POLE_TOP, 0], [FLAG_X + 0.14, POLE_TOP + 0.08, 0]]), {
    widthPx: 1.8,
  }); // finial
}

function buildCloth(set: StrokeSetApi, red: string, blue: string): void {
  // seven red stripe strokes, flying in positive x from the pole, with a baked
  // furl in z that the wobble and boil animate into a wave
  const stripeY = [1.42, 1.52, 1.62, 1.72, 1.82, 1.92, 2.02];
  for (let i = 0; i < stripeY.length; i++) {
    const y = stripeY[i];
    const x0 = i >= 4 ? FLAG_X + 0.7 : FLAG_X + 0.02; // top stripes clear the canton
    const stripe: THREE.Vector3[] = [];
    for (let j = 0; j <= 4; j++) {
      const x = mix(x0, FLAG_X + 1.4, j / 4);
      stripe.push(new THREE.Vector3(x, y, Math.sin(j * 1.3 + i) * 0.06));
    }
    const w = i / (stripeY.length - 1);
    set.addStroke(stripe, { color: red, widthPx: 2.6, drawWindow: [w * 0.5, w * 0.5 + 0.45] });
  }

  // blue canton as a small block of short hatch strokes, upper left of the cloth
  for (let i = 0; i < 8; i++) {
    const y = mix(1.8, 2.04, i / 7);
    const cant: THREE.Vector3[] = [];
    for (let j = 0; j <= 2; j++) {
      const x = mix(FLAG_X + 0.04, FLAG_X + 0.62, j / 2);
      cant.push(new THREE.Vector3(x, y, Math.sin(j + i) * 0.04));
    }
    set.addStroke(cant, { color: blue, widthPx: 2.2, drawWindow: [0.5, 1.0] });
  }
}

export const moonScene: FilmScene = {
  id: 'moon',
  mount(ctx: FilmContext) {
    terrain = ctx.makeStrokeSet({ style: { widthPx: 2.0 }, maxPoints: 520 });
    figure = ctx.makeStrokeSet({ style: { widthPx: 1.8, dust: false }, maxPoints: 128 });
    pole = ctx.makeStrokeSet({ style: { widthPx: 2.2, dust: false }, maxPoints: 64 });
    cloth = ctx.makeStrokeSet({
      style: { widthPx: 2.6, dust: false, colorBypass: true, wobbleAmp: 0.12, wobbleFreq: 2.4 },
      maxPoints: 128,
    });

    buildTerrain(terrain);
    buildFigure(figure);
    buildPole(pole);
    buildCloth(cloth, ctx.look.flagRed, ctx.look.flagBlue);

    figureGroup.position.copy(FIG_POS);
    figureGroup.add(figure.object3d);
    clothGroup.position.set(0, 0, 0);
    clothGroup.add(cloth.object3d);
    root.add(terrain.object3d, pole.object3d, figureGroup, clothGroup);
    root.position.set(REGIONS.moon, 0, 0);
    ctx.three.scene.add(root);
  },

  update(local: number, _global: number, ctx: FilmContext) {
    terrain.setDraw(smoothstep(0, DRAW_TERRAIN_OUT, local));
    figure.setDraw(smoothstep(FIG_IN, FIG_OUT, local));
    pole.setDraw(smoothstep(POLE_IN, POLE_OUT, local));

    // the cloth draws on upward while its group lifts into place
    cloth.setDraw(smoothstep(CLOTH_DRAW_IN, CLOTH_DRAW_OUT, local));
    clothGroup.position.y = mix(-CLOTH_LIFT, 0, smoothstep(LIFT_IN, LIFT_OUT, local));

    const t = ctx.time();
    const cam = ctx.three.camera;
    const vp = ctx.viewport();
    terrain.update(t, cam, vp);
    figure.update(t, cam, vp);
    pole.update(t, cam, vp);
    cloth.update(t, cam, vp);
  },

  setVisible(v: boolean) {
    root.visible = v;
  },

  dispose() {
    terrain.dispose();
    figure.dispose();
    pole.dispose();
    cloth.dispose();
  },
};
