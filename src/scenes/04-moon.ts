/**
 * Link 4: the lunar surface, a distant suited figure, and the flag.
 *
 * Fill pass. The earlier version read as a thin band in an empty viewport, so
 * this one gives the frame mass and depth in the pen-sketch language the Newton
 * scene uses: layered rolling contours that run edge to edge, two big grazing
 * craters whose rims exit the frame, an astronaut and the lunar module
 * silhouetted on the horizon, an Earth high in the wide, and a larger flag that
 * owns the centre at 0.68. All tonal hatch (crater rim shadows, regolith bands)
 * reads the film's one direction, LOOK.hatchAngleRad, and shares a boil phase
 * per patch; descriptive marks (rock ticks, the pole) keep their own directions.
 *
 * The flag is the only colour in the film: its cloth carries flagRed and
 * flagBlue on colorBypass sets, everything else is chalk white. It flies at
 * full hoist, the cloth's top edge at the pole tip and its centre at
 * [183.8, 2.7, 0], the point the closing camera keys push into. The canton is a
 * clean star field of short dashed rows rather than hatch. The flag rises
 * around global 0.68 by drawing on upward while the cloth group lifts to the
 * tip; the wave is left to the baked stroke wobble and the boil. After 0.78 the
 * camera pushes in and the DOM fade owns the frame, so the scene just keeps the
 * cloth drawn.
 *
 * Widths are authored plain: the global LOOK.widthMul carries the pen weight, so
 * nothing here compensates for it.
 */

import * as THREE from 'three';
import type { FilmContext, FilmScene, StrokeSetApi } from '../lib/types';
import { REGIONS } from '../film.config';
import { hatchQuad } from '../look/hatch';

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
// The lunar module on the ground, silhouetted on the horizon. World 176.5 (the
// suggested spot) projects off the left edge at the 0.6 camera, so it sits a
// little right of there, landing mid-left and below the Earth, the frame reading
// module, astronaut, flag left to right.
const LM_POS = new THREE.Vector3(0, 0, -7);
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
let canton!: StrokeSetApi; // the star field dashes, in their own calm set

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
/**
 * A short straight tick as three points. The stroke ribbon tapers its width
 * by aU toward both ends, so a two point polyline has no interior point and
 * renders as a hairline; the midpoint gives small marks a full width body.
 */
function seg3(a: readonly number[], b: readonly number[]): THREE.Vector3[] {
  return poly([
    [a[0], a[1], a[2]],
    [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2],
    [b[0], b[1], b[2]],
  ]);
}
/**
 * Sample a catmull-rom curve through the control points. The control points are
 * jittered once by about 0.01 before splining so the line reads hand-drawn, and
 * the samples carry no per-vertex jitter, so the curve stays smooth not squiggly.
 */
function smoothCurve(ctrl: readonly number[][], closed: boolean, samples: number, seed: number): THREE.Vector3[] {
  const rng = makeRng(seed);
  const cps: THREE.Vector3[] = [];
  for (const c of ctrl) {
    cps.push(
      new THREE.Vector3(c[0] + (rng() - 0.5) * 0.02, c[1] + (rng() - 0.5) * 0.02, c[2] + (rng() - 0.5) * 0.012),
    );
  }
  const cv = new THREE.CatmullRomCurve3(cps, closed, 'catmullrom');
  const out: THREE.Vector3[] = [];
  for (let i = 0; i <= samples; i++) out.push(cv.getPoint(i / samples));
  return out;
}

/** A rolling hill contour across the region, confident and sparse. */
function contour(z: number, baseY: number, amp: number, seed: number): THREE.Vector3[] {
  const rng = makeRng(seed);
  const p1 = rng() * 6.28;
  const p2 = rng() * 6.28;
  const steps = 150; // spans well past both frame edges at every aspect
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    // world 160 to 246; the far right end clears the right edge at 0.6 even on an
    // ultrawide, where the vanishing point sits out near world 242, so no endpoint
    // shows mid-sky at any aspect
    const x = mix(-20, 66, u);
    const y = baseY + Math.sin(x * 0.22 + p1) * amp + Math.sin(x * 0.5 + p2) * amp * 0.4;
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
  const p1 = rng() * 6.28;
  const p2 = rng() * 6.28;
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= 48; i++) {
    const a = start + (i / 48) * Math.PI * 2;
    // a truly smooth circle: two low harmonics under 1.5 percent, no visible corner
    const rr = r * (1 + 0.008 * Math.sin(a + p1) + 0.005 * Math.sin(a * 2 + p2));
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
  // three overlapping rolling ridges at different depths read as layered hills,
  // each running past both frame edges so no endpoint shows mid-sky, and the
  // floating distant craters and rock ticks are gone so nothing hangs unconnected
  const ridges: THREE.Vector3[][] = [
    contour(-8.5, 0.25, 0.5, 61),
    contour(-11, 0.7, 0.6, 62),
    contour(-14, 1.1, 0.7, 63),
  ];
  // depth layering in weight: nearest ridge midweight, the far hills lightest
  const ridgeWidth = [2.2, 2.0, 1.8];
  for (let i = 0; i < ridges.length; i++) {
    set.addStroke(ridges[i], { widthPx: ridgeWidth[i], drawWindow: win(i * 0.06, 0.18) });
  }
  buildLunarModule(set);
}

function buildLunarModule(set: StrokeSetApi): void {
  // Apollo lunar module as chalk, three-quarter from behind, silhouetted on the
  // horizon, about 2.8 units tall: a descent octagon with panel seams, four wide
  // splayed legs at body weight each on a clear footpad, a ladder hint, the
  // stepped ascent stage with a dome, and an antenna tick
  // taller by 1.4 for the 2.8 unit height, only a little wider so it keeps its
  // clearances: the near footpads stay left of the astronaut and inside the frame
  const SY = 1.4;
  const SXZ = 1.15;
  const seg = (coords: readonly number[][], width: number, base: number): void => {
    const pts: THREE.Vector3[] = [];
    for (const c of coords) {
      pts.push(new THREE.Vector3(LM_POS.x + c[0] * SXZ, LM_POS.y + c[1] * SY, LM_POS.z + c[2] * SXZ));
    }
    // seams, legs, and rungs author as two points; the ribbon needs an interior
    // point for width, so straight pairs gain a midpoint
    if (pts.length === 2) pts.splice(1, 0, pts[0].clone().lerp(pts[1], 0.5));
    set.addStroke(pts, { widthPx: width, drawWindow: win(base, 0.16) });
  };
  seg(
    [[-0.5, 0.55, -0.05], [-0.3, 0.5, -0.05], [0.3, 0.5, 0.05], [0.5, 0.55, 0.05], [0.5, 1.15, 0.05], [0.3, 1.25, 0.05], [-0.3, 1.25, -0.05], [-0.5, 1.15, -0.05], [-0.5, 0.55, -0.05]],
    2.4,
    0.16,
  );
  seg([[-0.15, 0.6, 0.05], [-0.15, 1.2, 0.05]], 1.8, 0.22);
  seg([[-0.5, 0.92, 0], [0.5, 0.92, 0.02]], 1.8, 0.22);
  // four legs, all at body weight, splayed wider than before, each on a footpad
  seg([[0.42, 0.55, 0.12], [1.0, 0.02, 0.4]], 2.4, 0.26);
  seg([[-0.42, 0.55, 0.12], [-1.0, 0.02, 0.4]], 2.4, 0.26);
  seg([[0.38, 0.55, -0.16], [0.8, 0.02, -0.45]], 2.4, 0.28);
  seg([[-0.38, 0.55, -0.16], [-0.8, 0.02, -0.45]], 2.4, 0.28);
  seg([[0.88, 0.02, 0.34], [1.12, 0.02, 0.46]], 2.2, 0.3);
  seg([[-1.12, 0.02, 0.46], [-0.88, 0.02, 0.34]], 2.2, 0.3);
  seg([[0.68, 0.02, -0.39], [0.92, 0.02, -0.51]], 2.2, 0.31);
  seg([[-0.92, 0.02, -0.51], [-0.68, 0.02, -0.39]], 2.2, 0.31);
  // a ladder hint of three rungs on the near-left leg, at similar weight
  seg([[-0.55, 0.42, 0.2], [-0.72, 0.42, 0.26]], 2.2, 0.34);
  seg([[-0.62, 0.29, 0.28], [-0.79, 0.29, 0.34]], 2.2, 0.35);
  seg([[-0.69, 0.16, 0.36], [-0.86, 0.16, 0.42]], 2.2, 0.36);
  seg(
    [[-0.32, 1.25, 0], [0.32, 1.25, 0], [0.34, 1.5, 0], [0.22, 1.5, 0], [0.22, 1.68, 0], [-0.22, 1.68, 0], [-0.22, 1.5, 0], [-0.34, 1.5, 0], [-0.32, 1.25, 0]],
    2.4,
    0.2,
  );
  seg([[-0.18, 1.68, 0], [0, 1.8, 0.02], [0.18, 1.68, 0]], 1.8, 0.24);
  seg([[0.05, 1.8, 0], [0.13, 2.05, 0]], 1.4, 0.26);
}

/* ------------------------------------------------------------------ */
/* Foreground: two big grazing craters, rocks, and regolith bands      */
/* ------------------------------------------------------------------ */

interface Crater {
  cx: number;
  cz: number;
  r: number;
  seed: number;
}
const CRATERS: Crater[] = [
  { cx: -1.2, cz: 3.6, r: 3.7, seed: 71 },
  { cx: 3.0, cz: 2.6, r: 2.9, seed: 72 },
];

function buildForeground(set: StrokeSetApi, hatch: number): void {
  // a short ground arc, for the far inner lip of a crater bowl
  const arc = (cx: number, cz: number, rx: number, rz: number, a0: number, a1: number, segs: number): THREE.Vector3[] => {
    const out: THREE.Vector3[] = [];
    for (let i = 0; i <= segs; i++) {
      const a = mix(a0, a1, i / segs);
      out.push(new THREE.Vector3(cx + Math.cos(a) * rx, 0.02, cz + Math.sin(a) * rz));
    }
    return out;
  };
  const cd = new THREE.Vector3(Math.cos(hatch), 0, Math.sin(hatch));
  const cn = new THREE.Vector3(-Math.sin(hatch), 0, Math.cos(hatch));
  let base = 0.0;
  for (const cr of CRATERS) {
    // the bold rim, big enough that its near arc runs off the bottom of the frame
    set.addStroke(groundBlob(cr.cx, cr.cz, cr.r, cr.seed, 40), { widthPx: 2.6, drawWindow: win(base, 0.2) });
    // the bowl: a partial far inner lip offset toward the far side, a lit crescent
    // of hatch on the lower-right inner wall, and a few ticks outside the near rim
    set.addStroke(
      arc(cr.cx, cr.cz - cr.r * 0.14, cr.r * 0.6, cr.r * 0.6 * 0.62, Math.PI * 1.16, Math.PI * 1.84, 22),
      { widthPx: 1.8, drawWindow: win(base + 0.08, 0.18) },
    );
    const bc = new THREE.Vector3(cr.cx + cr.r * 0.28, 0.02, cr.cz + cr.r * 0.22);
    const crescent: THREE.Vector3[][] = [];
    for (let i = 0; i < 5; i++) {
      const s = i / 4;
      const c = bc.clone().addScaledVector(cn, mix(-0.24, 0.24, s) * cr.r);
      const half = (0.26 - 0.4 * Math.abs(s - 0.5)) * cr.r;
      crescent.push([c.clone().addScaledVector(cd, -half), c.clone(), c.clone().addScaledVector(cd, half)]);
    }
    addHatch(set, crescent, 1.5, base + 0.2, 0.2, cr.seed + 9);
    for (let i = 0; i < 3; i++) {
      const a = mix(0.34, 0.66, i / 2) * Math.PI;
      const bx = cr.cx + Math.cos(a) * cr.r * 1.03;
      const bz = cr.cz + Math.sin(a) * cr.r * 0.62 * 1.03;
      set.addStroke(seg3([bx, 0.02, bz], [bx + Math.cos(a) * 0.22, 0.05, bz + Math.sin(a) * 0.15]), {
        widthPx: 1.4,
        drawWindow: win(base + 0.26, 0.12),
      });
    }
    base += 0.32;
  }
  // the scattered rocks and their shadow ticks are removed: they cluttered the
  // print's foreground and read as floating debris; the crater bowls and the
  // regolith bands carry the foreground and the immediate foreground stays clean

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

interface FigurePart {
  c: number[][];
  closed: boolean;
  s: number; // samples along the curve
  w: number; // width px
  d: number; // draw window base
}

function buildFigure(set: StrokeSetApi): void {
  // an astronaut from behind, read clearly: a distinct helmet dome above a clean
  // PLSS pack with a neck gap, puffy arms bowing from the pack sides, thick legs
  // into wide flat boots, a slight forward lean; connected flowing curves only
  const parts: FigurePart[] = [
    // the PLSS pack, one clean rounded rectangle at shoulder width, on the back
    { c: [[-0.3, 0.62, 0.03], [-0.25, 0.58, 0.03], [0.25, 0.58, 0.03], [0.3, 0.62, 0.03], [0.3, 1.16, 0.03], [0.25, 1.2, 0.03], [-0.25, 1.2, 0.03], [-0.3, 1.16, 0.03]], closed: true, s: 26, w: 2.6, d: 0.0 },
    // a horizontal strap and a vertical seam on the pack
    { c: [[-0.24, 0.9, 0.045], [0, 0.92, 0.05], [0.24, 0.9, 0.045]], closed: false, s: 10, w: 2.4, d: 0.14 },
    { c: [[0, 0.62, 0.05], [0.01, 0.9, 0.05], [0, 1.16, 0.05]], closed: false, s: 10, w: 2.4, d: 0.18 },
    // a thin neck collar bridging the gap up to the helmet
    { c: [[-0.09, 1.2, 0.02], [0, 1.28, 0], [0.09, 1.2, 0.02]], closed: false, s: 8, w: 2.4, d: 0.22 },
    // the helmet dome, distinct and above the pack, leaning slightly forward
    { c: [[0, 1.68, -0.02], [0.18, 1.6, -0.02], [0.2, 1.46, -0.01], [0.13, 1.37, 0], [0, 1.35, 0], [-0.13, 1.37, 0], [-0.2, 1.46, -0.01], [-0.18, 1.6, -0.02]], closed: true, s: 24, w: 2.6, d: 0.28 },
    // a small crown highlight on the helmet
    { c: [[-0.11, 1.6, -0.01], [0, 1.65, -0.01], [0.11, 1.6, -0.01]], closed: false, s: 8, w: 2.4, d: 0.34 },
    // puffy arms bowing outward from the pack's sides
    { c: [[-0.29, 1.12, 0.02], [-0.4, 0.98, 0.02], [-0.42, 0.82, 0.02], [-0.36, 0.68, 0.02], [-0.3, 0.58, 0.02]], closed: false, s: 16, w: 2.5, d: 0.4 },
    { c: [[0.29, 1.12, 0.02], [0.4, 0.98, 0.02], [0.42, 0.82, 0.02], [0.36, 0.68, 0.02], [0.3, 0.58, 0.02]], closed: false, s: 16, w: 2.5, d: 0.44 },
    // two thick smooth legs, each flowing into a wide flat boot
    { c: [[-0.16, 0.6, 0], [-0.2, 0.42, 0], [-0.23, 0.22, 0], [-0.24, 0.08, -0.02], [-0.29, 0.03, -0.09], [-0.13, 0.02, -0.15]], closed: false, s: 18, w: 2.6, d: 0.52 },
    { c: [[0.16, 0.6, 0], [0.2, 0.42, 0], [0.23, 0.22, 0], [0.24, 0.08, -0.02], [0.29, 0.03, -0.09], [0.13, 0.02, -0.15]], closed: false, s: 18, w: 2.6, d: 0.56 },
  ];
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    set.addStroke(smoothCurve(p.c, p.closed, p.s, 900 + i), { widthPx: p.w, drawWindow: win(p.d, 0.35) });
  }
}

/* ------------------------------------------------------------------ */
/* Sky and pole: the flag pole plus the Earth, both chalk white        */
/* ------------------------------------------------------------------ */

function buildSkyPole(set: StrokeSetApi): void {
  if (EARTH_ENABLED) {
    // the disk outline draws first, early in the set draw space
    set.addStroke(skyRing(EARTH_POS.x, EARTH_POS.y, EARTH_R, EARTH_POS.z, 81), {
      widthPx: 1.9,
      drawWindow: win(0.0, 0.18),
    });
    // the western hemisphere: the Americas as three connected chalk coastlines,
    // slightly left of centre, about half the disk wide, control-point jitter
    // only, no per-sample jitter; the rest of the disk stays bare board
    const cont = (ctrl: number[][], closed: boolean, samples: number, seed: number): void => {
      const pts = smoothCurve(ctrl, closed, samples, seed);
      for (const p of pts) p.set(EARTH_POS.x + p.x * EARTH_R, EARTH_POS.y + p.y * EARTH_R, EARTH_POS.z);
      set.addStroke(pts, { widthPx: 1.8, drawWindow: win(0.06, 0.3) });
    };
    // North America, the Alaska bulge down through the Gulf
    cont(
      [[-0.52, 0.55, 0], [-0.22, 0.68, 0], [0.15, 0.62, 0], [0.22, 0.36, 0], [0.05, 0.19, 0], [-0.13, 0.14, 0], [-0.33, 0.3, 0], [-0.47, 0.45, 0]],
      true,
      28,
      91,
    );
    // a short Central America isthmus link
    cont([[-0.1, 0.14, 0], [-0.03, 0.04, 0], [0.04, -0.06, 0]], false, 10, 92);
    // South America, tapering to the tip
    cont(
      [[0.02, -0.04, 0], [0.2, -0.1, 0], [0.26, -0.35, 0], [0.12, -0.58, 0], [-0.05, -0.7, 0], [-0.07, -0.4, 0], [-0.04, -0.15, 0]],
      true,
      24,
      93,
    );
    // Africa's western bulge enters at the middle-right edge, one confident
    // coastline hugging the rim across roughly the rightmost 15 percent of
    // the disk
    cont(
      [[0.84, 0.54, 0], [0.72, 0.32, 0], [0.68, 0.1, 0], [0.74, -0.08, 0], [0.7, -0.26, 0], [0.84, -0.54, 0]],
      false,
      16,
      94,
    );
  }

  // the pole plants late in the set draw space, just before the cloth rises
  set.addStroke(
    poly([
      [FLAG_X - 0.07, 0, 0],
      [FLAG_X - 0.03, POLE_TOP * 0.5, 0],
      [FLAG_X, POLE_TOP, 0],
    ]),
    { widthPx: 2.4, drawWindow: win(0.7, 0.28) },
  );
  // the finial stays a small nub continuing the pole line past the tip
  set.addStroke(seg3([FLAG_X, POLE_TOP, 0], [FLAG_X + 0.02, POLE_TOP + 0.06, 0]), {
    widthPx: 1.9,
    drawWindow: win(0.9, 0.1),
  });
}

/* ------------------------------------------------------------------ */
/* Cloth: seven red stripes and a blue canton, the film's only colour  */
/* ------------------------------------------------------------------ */

const STRIPE_Y = [2.3, 2.43, 2.57, 2.7, 2.83, 2.97, 3.1];
const CANTON_BOTTOM = 2.7;
const CANTON_LEFT = FLAG_X + 0.04;
const CANTON_RIGHT = FLAG_X + 0.66;
const STRIPE_FAR = FLAG_X + 1.6;
const HOIST_GAP = 0.05; // stripes anchor this close to the pole or the canton edge
const CLOTH_TOP = POLE_TOP; // full hoist, the top edge hangs at the pole tip
const CLOTH_BOTTOM = 2.2; // centre lands on [183.8, 2.7, 0], the closing camera target

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

function buildCloth(set: StrokeSetApi, red: string, blue: string): void {
  // a light outline ties the stripes and the canton into one cloth: hoist top,
  // along the fly, and back to hoist bottom, each edge slightly waved
  const outline: THREE.Vector3[] = [new THREE.Vector3(FLAG_X, CLOTH_TOP, clothZ(FLAG_X, CLOTH_TOP))];
  wavedEdge(FLAG_X, CLOTH_TOP, STRIPE_FAR, CLOTH_TOP, 6, outline);
  wavedEdge(STRIPE_FAR, CLOTH_TOP, STRIPE_FAR, CLOTH_BOTTOM, 6, outline);
  wavedEdge(STRIPE_FAR, CLOTH_BOTTOM, FLAG_X, CLOTH_BOTTOM, 6, outline);
  set.addStroke(outline, { color: red, widthPx: 2.2, drawWindow: win(0.0, 0.9) });

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
    set.addStroke(stripe, { color: red, widthPx: 3.4, drawWindow: win(w * 0.5, 0.45) });
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

/**
 * The canton star field, five rows of six short blue dashes. Each dash carries
 * interior points because the ribbon width tapers by aU, so a two point stroke
 * sits at both taper ends and collapses to a near invisible hairline. The rows
 * populate bottom to top with the draw, each row shares one boil phase, and a
 * small jitter per dash keeps the hand.
 */
function buildCanton(set: StrokeSetApi, blue: string): void {
  const rng = makeRng(90);
  const rows = 5;
  const cols = 6;
  const dashLen = 0.07;
  const left = CANTON_LEFT + 0.05 + dashLen / 2;
  const right = CANTON_RIGHT - 0.05 - dashLen / 2;
  const bottom = CANTON_BOTTOM + 0.07;
  const top = CLOTH_TOP - 0.07;
  for (let r = 0; r < rows; r++) {
    const rowY = mix(bottom, top, r / (rows - 1));
    for (let c = 0; c < cols; c++) {
      const cx = mix(left, right, c / (cols - 1)) + (rng() - 0.5) * 0.02;
      const y = rowY + (rng() - 0.5) * 0.016;
      const half = (dashLen + (rng() - 0.5) * 0.016) / 2;
      const dash: THREE.Vector3[] = [];
      for (let k = 0; k <= 3; k++) {
        const x = cx - half + (k / 3) * half * 2;
        dash.push(new THREE.Vector3(x, y, clothZ(x, y)));
      }
      set.addStroke(dash, {
        color: blue,
        drawWindow: win(0.1 + (r / (rows - 1)) * 0.5 + c * 0.02, 0.28),
        boilSeed: 90 + r,
      });
    }
  }
}

/* ------------------------------------------------------------------ */
/* Scene                                                               */
/* ------------------------------------------------------------------ */

export const moonScene: FilmScene = {
  id: 'moon',
  mount(ctx: FilmContext) {
    terrain = ctx.makeStrokeSet({ style: { widthPx: 2.2 }, maxPoints: 640 });
    foreground = ctx.makeStrokeSet({ style: { widthPx: 2.4, dust: false }, maxPoints: 760 });
    figure = ctx.makeStrokeSet({
      style: { widthPx: 2.4, dust: false, wobbleAmp: 0.012, wobbleFreq: 1.2 },
      maxPoints: 260,
    });
    skyPole = ctx.makeStrokeSet({ style: { widthPx: 2.2, dust: false }, maxPoints: 260 });
    cloth = ctx.makeStrokeSet({
      style: { widthPx: 2.8, dust: true, colorBypass: true, wobbleAmp: 0.12, wobbleFreq: 2.4 },
      maxPoints: 380,
    });
    // the star field needs interior points at full ribbon width, and marks
    // this small cannot ride the cloth set's big baked wobble, so the canton
    // dashes draw from their own calm set, one extra chalk pass draw call
    canton = ctx.makeStrokeSet({
      style: { widthPx: 3.0, dust: false, colorBypass: true, wobbleAmp: 0.01, wobbleFreq: 3 },
      maxPoints: 130,
    });

    buildTerrain(terrain);
    buildForeground(foreground, ctx.look.hatchAngleRad);
    buildFigure(figure);
    buildSkyPole(skyPole);
    buildCloth(cloth, ctx.look.flagRed, ctx.look.flagBlue);
    buildCanton(canton, ctx.look.flagBlue);

    figureGroup.position.copy(FIG_POS);
    figureGroup.scale.setScalar(FIG_SCALE);
    figureGroup.add(figure.object3d);
    clothGroup.add(cloth.object3d, canton.object3d);
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

    // the cloth and its canton draw on upward while the group lifts into place
    const clothDraw = smoothstep(g2l(CLOTH_DRAW_IN), g2l(CLOTH_DRAW_OUT), local);
    cloth.setDraw(clothDraw);
    canton.setDraw(clothDraw);
    clothGroup.position.y = mix(-CLOTH_LIFT, 0, smoothstep(g2l(LIFT_IN), g2l(LIFT_OUT), local));

    const t = ctx.time();
    const cam = ctx.three.camera;
    const vp = ctx.viewport();
    terrain.update(t, cam, vp);
    foreground.update(t, cam, vp);
    figure.update(t, cam, vp);
    skyPole.update(t, cam, vp);
    cloth.update(t, cam, vp);
    canton.update(t, cam, vp);
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
    canton.dispose();
  },
};
