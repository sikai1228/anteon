/**
 * Link 4: the lunar surface, a distant suited figure, and the flag.
 *
 * Fill pass. The earlier version read as a thin band in an empty viewport, so
 * this one gives the frame mass and depth in the pen-sketch language the Newton
 * scene uses: layered rolling contours for the ground, two big grazing craters
 * that cut the bottom edge at the 0.6 key, a mid-ground figure that silhouettes
 * against the sky, an Earth high in the wide, and a larger flag that owns the
 * centre at 0.68. All tonal hatch (crater rim shadows, regolith bands, the Earth
 * crescent, the flag canton) reads the film's one direction, LOOK.hatchAngleRad,
 * and shares a boil phase per patch; descriptive marks (rock ticks, the pole)
 * keep their own directions.
 *
 * The flag is the only colour in the film: its cloth carries flagRed and
 * flagBlue on a colorBypass set, everything else is chalk white. It rises around
 * global 0.68 by drawing on upward while the cloth group lifts; the wave is left
 * to the baked stroke wobble and the boil. After 0.78 the camera pushes in and
 * the DOM fade owns the frame, so the scene just keeps the cloth drawn.
 *
 * Widths are authored plain: the global LOOK.widthMul carries the pen weight, so
 * nothing here compensates for it.
 */

import * as THREE from 'three';
import type { FilmContext, FilmScene, StrokeSetApi } from '../lib/types';
import { REGIONS } from '../film.config';
import { hatchDisk, hatchQuad } from '../look/hatch';

/* Range remap, so beats read as the global t the storyboard uses. */
const RANGE_IN = 0.5;
const RANGE_OUT = 0.87;
const SPAN = RANGE_OUT - RANGE_IN;
function g2l(g: number): number {
  return (g - RANGE_IN) / SPAN;
}

/* Timing, written as global t and remapped through g2l. */
const TERRAIN_IN = 0.5;
const TERRAIN_OUT = 0.585; // lunar wide reveal
const FIG_IN = 0.55;
const FIG_OUT = 0.6; // figure resolves as the wide settles
const FORE_IN = 0.5;
const FORE_OUT = 0.6; // foreground craters establish with the wide
const SKY_POLE_OUT = 0.685; // pole planted just before the cloth rises
const CLOTH_DRAW_IN = 0.655;
const CLOTH_DRAW_OUT = 0.73;
const LIFT_IN = 0.655;
const LIFT_OUT = 0.73; // cloth fully up by global 0.73
const CLOTH_LIFT = 1.0; // how far below its rest the cloth starts

/* Placement, local to the region x. World x is this plus REGIONS.moon. */
const EARTH_ENABLED = true; // the user may veto the Earth
const EARTH_POS = new THREE.Vector3(0.5, 5.8, -14);
const EARTH_R = 0.55;
const FIG_POS = new THREE.Vector3(2.4, 0, -6.5); // sits fully inside frame at 0.6, 0.68, 0.75
const FIG_SCALE = 1.15;
const FLAG_X = 3; // world 183
const POLE_TOP = 3.2;

const root = new THREE.Group();
const figureGroup = new THREE.Group();
const clothGroup = new THREE.Group();
let terrain!: StrokeSetApi;
let foreground!: StrokeSetApi;
let figure!: StrokeSetApi;
let skyPole!: StrokeSetApi; // the pole plus the Earth, both chalk white
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
function poly(coords: readonly number[][]): THREE.Vector3[] {
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
function win(c: number, w: number): [number, number] {
  return [clamp01(c), clamp01(c + w)];
}

/** A rolling hill contour across the region, confident and sparse. */
function contour(z: number, baseY: number, amp: number, seed: number): THREE.Vector3[] {
  const rng = makeRng(seed);
  const p1 = rng() * 6.28;
  const p2 = rng() * 6.28;
  const steps = 72; // dense enough that the visible arc up close reads smooth
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const x = mix(-9, 13, u);
    const y = baseY + Math.sin(u * 3.1 + p1) * amp + Math.sin(u * 7.3 + p2) * amp * 0.4;
    pts.push(new THREE.Vector3(x, Math.max(0.02, y), z));
  }
  return pts;
}

/**
 * A closed ring on the ground plane, for crater rims. The radius is modulated
 * by two low-frequency harmonics rather than per-vertex jitter, so a high
 * segment count reads as a confident hand arc instead of a spiky polygon.
 */
function groundBlob(cx: number, cz: number, r: number, seed: number, segs: number): THREE.Vector3[] {
  const rng = makeRng(seed);
  const start = rng() * 6.28;
  const h1 = 0.05 + rng() * 0.05;
  const h2 = 0.03 + rng() * 0.04;
  const p1 = rng() * 6.28;
  const p2 = rng() * 6.28;
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= segs; i++) {
    const a = start + (i / segs) * Math.PI * 2;
    const rr = r * (1 + h1 * Math.sin(a + p1) + h2 * Math.sin(a * 2 + p2));
    pts.push(new THREE.Vector3(cx + Math.cos(a) * rr, 0.02, cz + Math.sin(a) * rr * 0.62));
  }
  return pts;
}

/** A wobbly closed ring facing the camera, for the Earth disk. */
function skyRing(cx: number, cy: number, r: number, z: number, seed: number): THREE.Vector3[] {
  const rng = makeRng(seed);
  const start = rng() * 6.28;
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= 22; i++) {
    const a = start + (i / 22) * Math.PI * 2;
    const rr = r * (1 + (rng() - 0.5) * 0.08);
    pts.push(new THREE.Vector3(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, z));
  }
  return pts;
}

/** Add a bundle of hatch lines with a cascading draw across the set. */
function addHatch(
  set: StrokeSetApi,
  lines: THREE.Vector3[][],
  width: number,
  base: number,
  span: number,
  boilSeed: number,
): void {
  // one boilSeed for the whole patch, so it re-registers as a unit, not a shimmer
  const n = Math.max(1, lines.length - 1);
  for (let i = 0; i < lines.length; i++) {
    set.addStroke(lines[i], { widthPx: width, drawWindow: win(base + (i / n) * span, 0.14), boilSeed });
  }
}

/* ------------------------------------------------------------------ */
/* Terrain: layered contours plus a little sparse distant detail       */
/* ------------------------------------------------------------------ */

function buildTerrain(set: StrokeSetApi): void {
  // three overlapping rolling ridges at different depths read as layered hills
  const ridges: THREE.Vector3[][] = [
    contour(-8.5, 0.25, 0.5, 61),
    contour(-11, 0.7, 0.6, 62),
    contour(-14, 1.1, 0.7, 63),
  ];
  for (let i = 0; i < ridges.length; i++) {
    set.addStroke(ridges[i], { widthPx: 2.4, drawWindow: win(i * 0.06, 0.18) });
  }

  // a few distant craters and rock ticks, kept sparse so the ridges stay clean
  const rng = makeRng(64);
  for (let i = 0; i < 3; i++) {
    const cx = mix(-6, 10, rng());
    const cz = mix(-12, -7, rng());
    set.addStroke(groundBlob(cx, cz, 0.5 + rng() * 0.5, 640 + i, 24), {
      widthPx: 1.6,
      drawWindow: win(0.4 + i * 0.05, 0.14),
    });
  }
  for (let i = 0; i < 8; i++) {
    const bx = mix(-7, 11, rng());
    const bz = mix(-12, -6.5, rng());
    const a = rng() * Math.PI;
    const len = 0.12 + rng() * 0.22;
    set.addStroke(
      poly([
        [bx, 0.02, bz],
        [bx + Math.cos(a) * len, 0.02 + rng() * 0.14, bz + Math.sin(a) * len],
      ]),
      { widthPx: 1.5, drawWindow: win(0.5 + (i % 4) * 0.05, 0.12) },
    );
  }
}

/* ------------------------------------------------------------------ */
/* Foreground: two big grazing craters, rocks, and regolith bands      */
/* ------------------------------------------------------------------ */

interface Crater {
  cx: number;
  cz: number;
  r: number;
  seed: number;
  shadowSign: number; // which side carries the rim shadow
}
const CRATERS: Crater[] = [
  { cx: -0.6, cz: 3.4, r: 3.0, seed: 71, shadowSign: -1 },
  { cx: 2.6, cz: 2.4, r: 2.3, seed: 72, shadowSign: 1 },
];

function buildForeground(set: StrokeSetApi, hatch: number): void {
  let base = 0.0;
  for (const cr of CRATERS) {
    // the rim, big enough that its near arc runs off the bottom of the frame
    set.addStroke(groundBlob(cr.cx, cr.cz, cr.r, cr.seed, 40), {
      widthPx: 2.6,
      drawWindow: win(base, 0.2),
    });
    set.addStroke(groundBlob(cr.cx, cr.cz, cr.r * 0.6, cr.seed + 5, 32), {
      widthPx: 1.8,
      drawWindow: win(base + 0.08, 0.18),
    });
    // a short patch of rim-shadow hatch on one side, hatched flat on the ground
    const sx = cr.cx + cr.shadowSign * cr.r * 0.35;
    const corner = new THREE.Vector3(sx - cr.r * 0.3, 0.02, cr.cz - cr.r * 0.32);
    const uDir = new THREE.Vector3(cr.r * 0.6, 0, 0);
    const vDir = new THREE.Vector3(0, 0, cr.r * 0.64);
    addHatch(set, hatchQuad(corner, uDir, vDir, hatch, 0.2, cr.seed + 9), 1.5, base + 0.2, 0.2, cr.seed);
    base += 0.32;
  }

  // scattered rocks, each a small contour with a two-stroke hatch shadow
  const rng = makeRng(77);
  for (let i = 0; i < 6; i++) {
    const bx = mix(-3, 5, rng());
    const bz = mix(0.5, 4.5, rng());
    const rr = 0.18 + rng() * 0.22;
    set.addStroke(
      poly([
        [bx - rr, 0.02, bz],
        [bx - rr * 0.3, 0.02 + rr * 0.8, bz - rr * 0.2],
        [bx + rr * 0.5, 0.02 + rr * 0.7, bz],
        [bx + rr, 0.02, bz + rr * 0.2],
      ]),
      { widthPx: 1.8, drawWindow: win(0.66 + i * 0.02, 0.12) },
    );
    for (let k = 0; k < 2; k++) {
      const off = rr * (0.2 + k * 0.28);
      set.addStroke(
        poly([
          [bx - rr + off, 0.02, bz + rr * 0.3],
          [bx + rr * 0.2 + off, 0.02, bz + rr * 0.5],
        ]),
        { widthPx: 1.3, drawWindow: win(0.72 + i * 0.02, 0.1) },
      );
    }
  }

  // one or two sparse regolith bands so the ground has the hatched language
  addHatch(
    set,
    hatchQuad(
      new THREE.Vector3(-2, 0.02, 1.2),
      new THREE.Vector3(5.5, 0, 0),
      new THREE.Vector3(0, 0, 2.2),
      hatch,
      0.55,
      78,
    ),
    1.3,
    0.8,
    0.16,
    78,
  );
  addHatch(
    set,
    hatchQuad(
      new THREE.Vector3(1.5, 0.02, 4.2),
      new THREE.Vector3(4.5, 0, 0),
      new THREE.Vector3(0, 0, 1.6),
      hatch,
      0.6,
      79,
    ),
    1.3,
    0.86,
    0.14,
    79,
  );
}

/* ------------------------------------------------------------------ */
/* Figure: a small suited silhouette from behind, no face              */
/* ------------------------------------------------------------------ */

function buildFigure(set: StrokeSetApi): void {
  const circle: THREE.Vector3[] = [];
  for (let i = 0; i <= 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    circle.push(new THREE.Vector3(Math.cos(a) * 0.16, 1.12 + Math.sin(a) * 0.16, 0));
  }
  set.addStroke(circle, { widthPx: 2.0, drawWindow: win(0, 0.4) }); // helmet
  set.addStroke(
    poly([
      [-0.15, 0.5, -0.02],
      [0.15, 0.5, -0.02],
      [0.15, 1.0, -0.02],
      [-0.15, 1.0, -0.02],
      [-0.15, 0.5, -0.02],
    ]),
    { widthPx: 2.0, drawWindow: win(0.1, 0.4) },
  ); // backpack
  set.addStroke(
    poly([
      [-0.28, 0.6, 0],
      [-0.24, 0.98, 0],
      [0.24, 0.98, 0],
      [0.28, 0.6, 0],
    ]),
    { widthPx: 1.9, drawWindow: win(0.25, 0.4) },
  ); // shoulders and arms
  set.addStroke(poly([[-0.14, 0.55, 0], [-0.13, 0.05, 0]]), { widthPx: 2.1, drawWindow: win(0.4, 0.4) });
  set.addStroke(poly([[0.14, 0.55, 0], [0.13, 0.05, 0]]), { widthPx: 2.1, drawWindow: win(0.5, 0.4) });
}

/* ------------------------------------------------------------------ */
/* Sky and pole: the flag pole plus the Earth, both chalk white        */
/* ------------------------------------------------------------------ */

function buildSkyPole(set: StrokeSetApi, hatch: number): void {
  if (EARTH_ENABLED) {
    // the disk outline draws first, early in the set draw space
    set.addStroke(skyRing(EARTH_POS.x, EARTH_POS.y, EARTH_R, EARTH_POS.z, 81), {
      widthPx: 1.9,
      drawWindow: win(0.0, 0.18),
    });
    // crescent shading: hatch the disk, keep the lines on the shaded limb only
    const lit = EARTH_POS.x + EARTH_R * 0.15; // terminator, shade to negative x
    const shade = (line: THREE.Vector3[]): boolean => {
      let sum = 0;
      for (const p of line) sum += p.x;
      return sum / line.length < lit;
    };
    // single hatch direction; the darker limb is a second same-angle pass at
    // tighter spacing, so tone comes from density, not a crossed second angle
    const a = hatchDisk(EARTH_POS, EARTH_R, hatch, 0.09, 82).filter(shade);
    const b = hatchDisk(EARTH_POS, EARTH_R * 0.9, hatch, 0.06, 83).filter(
      (line) => shade(line) && line[0].x < EARTH_POS.x - EARTH_R * 0.1,
    );
    addHatch(set, a, 1.4, 0.05, 0.28, 82);
    addHatch(set, b, 1.3, 0.12, 0.24, 82);
  }

  // the pole plants late in the set draw space, just before the cloth rises
  set.addStroke(
    poly([
      [FLAG_X, 0, 0],
      [FLAG_X + 0.04, POLE_TOP * 0.5, 0],
      [FLAG_X + 0.08, POLE_TOP, 0],
    ]),
    { widthPx: 2.4, drawWindow: win(0.7, 0.28) },
  );
  set.addStroke(poly([[FLAG_X + 0.08, POLE_TOP, 0], [FLAG_X + 0.2, POLE_TOP + 0.1, 0]]), {
    widthPx: 1.9,
    drawWindow: win(0.9, 0.1),
  });
}

/* ------------------------------------------------------------------ */
/* Cloth: seven red stripes and a blue canton, the film's only colour  */
/* ------------------------------------------------------------------ */

const STRIPE_Y = [1.42, 1.61, 1.81, 2.0, 2.19, 2.39, 2.58];
const CANTON_BOTTOM = 2.0;
const CANTON_LEFT = FLAG_X + 0.04;
const CANTON_RIGHT = FLAG_X + 1.2;
const STRIPE_FAR = FLAG_X + 2.8;
const HOIST_GAP = 0.05; // stripes anchor this close to the pole or the canton edge
const CLOTH_TOP = 2.68;
const CLOTH_BOTTOM = 1.32;

/**
 * The cloth hangs on one gently furled surface whose amplitude grows toward the
 * fly end, where the pole no longer holds it. Every stripe, the canton, and the
 * outline sample this, so at full draw they read as one sheet, not two blocks.
 */
function clothZ(x: number, y: number): number {
  const u = x - FLAG_X;
  const amp = 0.03 + 0.1 * clamp01(u / (STRIPE_FAR - FLAG_X));
  return Math.sin(u * 1.6 - y * 0.9 + 0.5) * amp;
}

/** Append a slightly waved edge from one corner to another onto out. */
function wavedEdge(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  steps: number,
  out: THREE.Vector3[],
): void {
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const x = mix(x0, x1, t);
    const y = mix(y0, y1, t);
    out.push(new THREE.Vector3(x, y, clothZ(x, y)));
  }
}

function buildCloth(set: StrokeSetApi, red: string, blue: string, hatch: number): void {
  // a light outline ties the stripes and the canton into one cloth: hoist top,
  // along the fly, and back to hoist bottom, each edge slightly waved
  const outline: THREE.Vector3[] = [new THREE.Vector3(FLAG_X, CLOTH_TOP, clothZ(FLAG_X, CLOTH_TOP))];
  wavedEdge(FLAG_X, CLOTH_TOP, STRIPE_FAR, CLOTH_TOP, 6, outline);
  wavedEdge(STRIPE_FAR, CLOTH_TOP, STRIPE_FAR, CLOTH_BOTTOM, 6, outline);
  wavedEdge(STRIPE_FAR, CLOTH_BOTTOM, FLAG_X, CLOTH_BOTTOM, 6, outline);
  set.addStroke(outline, { color: red, widthPx: 1.6, drawWindow: win(0.0, 0.9) });

  // stripes anchor at the pole, except the four at canton height which anchor at
  // the canton's right edge, all ending on the shared waved fly line
  for (let i = 0; i < STRIPE_Y.length; i++) {
    const y = STRIPE_Y[i];
    const x0 = (y >= CANTON_BOTTOM ? CANTON_RIGHT : FLAG_X) + HOIST_GAP;
    const stripe: THREE.Vector3[] = [];
    for (let j = 0; j <= 6; j++) {
      const x = mix(x0, STRIPE_FAR, j / 6);
      stripe.push(new THREE.Vector3(x, y, clothZ(x, y)));
    }
    const w = i / (STRIPE_Y.length - 1);
    set.addStroke(stripe, { color: red, widthPx: 2.8, drawWindow: win(w * 0.5, 0.45) });
  }

  // the canton as ordered diagonal hatch clipped to its rectangle: the film's
  // one hatch angle, tight spacing, a border, top flush with the cloth top and
  // all of it inside the outline, sharing one boil phase
  const corner = new THREE.Vector3(CANTON_LEFT, CANTON_BOTTOM, 0);
  const uDir = new THREE.Vector3(CANTON_RIGHT - CANTON_LEFT, 0, 0);
  const vDir = new THREE.Vector3(0, CLOTH_TOP - CANTON_BOTTOM, 0);
  const block = hatchQuad(corner, uDir, vDir, hatch, 0.045, 84);
  for (const line of block) for (const p of line) p.z = clothZ(p.x, p.y);
  const n = Math.max(1, block.length - 1);
  for (let i = 0; i < block.length; i++) {
    set.addStroke(block[i], { color: blue, widthPx: 2.2, drawWindow: win(0.5 + (i / n) * 0.35, 0.12), boilSeed: 84 });
  }
  // a single border stroke frames the canton flush with the cloth top edge
  const border: THREE.Vector3[] = [];
  for (const c of [
    [CANTON_LEFT, CANTON_BOTTOM],
    [CANTON_RIGHT, CANTON_BOTTOM],
    [CANTON_RIGHT, CLOTH_TOP],
    [CANTON_LEFT, CLOTH_TOP],
    [CANTON_LEFT, CANTON_BOTTOM],
  ]) {
    border.push(new THREE.Vector3(c[0], c[1], clothZ(c[0], c[1])));
  }
  set.addStroke(border, { color: blue, widthPx: 1.8, drawWindow: win(0.5, 0.45), boilSeed: 84 });
}

/* ------------------------------------------------------------------ */
/* Scene                                                               */
/* ------------------------------------------------------------------ */

export const moonScene: FilmScene = {
  id: 'moon',
  mount(ctx: FilmContext) {
    terrain = ctx.makeStrokeSet({ style: { widthPx: 2.2 }, maxPoints: 560 });
    foreground = ctx.makeStrokeSet({ style: { widthPx: 2.4, dust: false }, maxPoints: 760 });
    figure = ctx.makeStrokeSet({ style: { widthPx: 2.0, dust: false }, maxPoints: 160 });
    skyPole = ctx.makeStrokeSet({ style: { widthPx: 2.2, dust: false }, maxPoints: 260 });
    cloth = ctx.makeStrokeSet({
      style: { widthPx: 2.8, dust: false, colorBypass: true, wobbleAmp: 0.12, wobbleFreq: 2.4 },
      maxPoints: 380,
    });

    buildTerrain(terrain);
    buildForeground(foreground, ctx.look.hatchAngleRad);
    buildFigure(figure);
    buildSkyPole(skyPole, ctx.look.hatchAngleRad);
    buildCloth(cloth, ctx.look.flagRed, ctx.look.flagBlue, ctx.look.hatchAngleRad);

    figureGroup.position.copy(FIG_POS);
    figureGroup.scale.setScalar(FIG_SCALE);
    figureGroup.add(figure.object3d);
    clothGroup.add(cloth.object3d);
    root.add(terrain.object3d, foreground.object3d, skyPole.object3d, figureGroup, clothGroup);
    root.position.set(REGIONS.moon, 0, 0);
    ctx.three.scene.add(root);
  },

  update(local: number, _global: number, ctx: FilmContext) {
    terrain.setDraw(smoothstep(g2l(TERRAIN_IN), g2l(TERRAIN_OUT), local));
    foreground.setDraw(smoothstep(g2l(FORE_IN), g2l(FORE_OUT), local));
    figure.setDraw(smoothstep(g2l(FIG_IN), g2l(FIG_OUT), local));
    // the pole and Earth share one set: Earth draws first, the pole plants late
    skyPole.setDraw(smoothstep(0, g2l(SKY_POLE_OUT), local));

    // the cloth draws on upward while its group lifts into place
    cloth.setDraw(smoothstep(g2l(CLOTH_DRAW_IN), g2l(CLOTH_DRAW_OUT), local));
    clothGroup.position.y = mix(-CLOTH_LIFT, 0, smoothstep(g2l(LIFT_IN), g2l(LIFT_OUT), local));

    const t = ctx.time();
    const cam = ctx.three.camera;
    const vp = ctx.viewport();
    terrain.update(t, cam, vp);
    foreground.update(t, cam, vp);
    figure.update(t, cam, vp);
    skyPole.update(t, cam, vp);
    cloth.update(t, cam, vp);
  },

  setVisible(v: boolean) {
    root.visible = v;
  },

  dispose() {
    terrain.dispose();
    foreground.dispose();
    figure.dispose();
    skyPole.dispose();
    cloth.dispose();
  },
};
