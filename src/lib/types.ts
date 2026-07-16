/**
 * The contract layer. Every module codes against these types.
 * Do not change signatures here without checking every owner in SPEC.md.
 */

import type * as THREE from 'three';

/* ------------------------------------------------------------------ */
/* Film structure                                                      */
/* ------------------------------------------------------------------ */

export type SceneId = 'newton' | 'flyer' | 'boot' | 'moon';

export interface SceneDef {
  id: SceneId;
  /** Global t range [in, out]. The scene is mounted and updated inside it. */
  range: [number, number];
}

export interface CaptionBeat {
  /** Key into COPY.captions, or 'quoteHold' for the existing #quote element. */
  key: string;
  tIn: number;
  tOut: number;
  /** Use an existing DOM element id instead of building one (the quote). */
  el?: string;
  /** Large closing card style. */
  card?: boolean;
  /** The film's last word: it never leaves. The beat pours in as usual, then
   * holds at full opacity, perfectly still, with no exit ramp and no float.
   * What ends it is the introduction's box climbing over it. */
  hold?: boolean;
  /** Small footnote style (the Lilienthal line). */
  small?: boolean;
  /** Beats can ship disabled; the runtime skips them. */
  enabled?: boolean;
  /**
   * Anchor point inside the STAGE BOX (the centered ref-aspect region the
   * camera fills), as fractions 0..1 of its width and height. Captions
   * anchored this way stay glued to the composition at any viewport aspect.
   * Omitted: the beat keeps the full-screen centered layout (quote, cards).
   */
  anchor?: [number, number];
  /**
   * Anchor fractions are of the VIEWPORT instead of the stage box: the
   * caption hugs the physical frame on any monitor. For beats staged
   * against screen edges rather than the composition.
   */
  screen?: boolean;
  /** Which edge of the text block pins to the anchor. Default center. */
  align?: 'left' | 'center' | 'right';
  /** Max line width in ch for anchored captions. Default 24. */
  maxCh?: number;
}

export interface FadeBeat {
  key: string;
  /** LookParams color name: 'flagRed' or 'board'. */
  color: 'flagRed' | 'board';
  tIn: number;
  /** Opacity ramps 0 to 1 across [tIn, tPeak], then 1 to 0 across [tPeak, tOut]. */
  tPeak: number;
  /** A tOut above 1 means the fade never releases. */
  tOut: number;
}

export interface CameraKey {
  t: number;
  pos: [number, number, number];
  target: [number, number, number];
  /** Roll around the view axis, degrees. Default 0. */
  roll?: number;
  /** Vertical field of view, degrees. Default LOOK.fov. */
  fov?: number;
}

/* ------------------------------------------------------------------ */
/* The look: one place for the whole aesthetic                         */
/* ------------------------------------------------------------------ */

export interface LookParams {
  chalkWhite: string;
  board: string;
  /** The only color in the film. Used by the flag and the flag fade. */
  flagRed: string;
  flagBlue: string;

  /** Boil: stroke jitter refresh rate, Hz. Hand-drawn signature. */
  boilHz: number;
  /** Boil amplitude as a fraction of viewport height (0.002 = 0.2%). */
  boilAmpPct: number;

  /**
   * The film's one hatch direction, radians from horizontal. Descending
   * left to right, about 30 degrees, per the style research: light rakes
   * from the upper left, and shallow parallels rhyme with a wide frame.
   * Every tonal hatch in every scene reads this; descriptive marks (bark
   * ticks, grass, tread) are the only exceptions.
   */
  hatchAngleRad: number;

  /** Tooth: board grain feature size in physical px, and its contrast 0..1. */
  toothPx: number;
  toothContrast: number;

  /**
   * Global stroke width multiplier, the one natural thickening lever.
   * Applied on top of every per-stroke width in the stroke shader.
   */
  widthMul: number;

  /** Dust halo pass: width multiplier and alpha. */
  dustWidthMul: number;
  dustAlpha: number;

  /** Post. */
  grain: number;
  grainHz: number;
  vignette: number;
  bloomStrength: number;
  bloomRadius: number;
  bloomThreshold: number;

  fov: number;
  dprCap: number;

  /** Ground synthesis mode for the post chain's final pass. */
  ground: 'slate' | 'parchment';
}

export type LookName = 'chalk' | 'vinci';

/** The shipping look: chalk on a slate board. */
const CHALK: LookParams = {
  chalkWhite: '#eceae4',
  board: '#0b0b0d',
  flagRed: '#e8503f',
  flagBlue: '#5f7fd6',

  boilHz: 8,
  boilAmpPct: 0.0022,

  hatchAngleRad: -0.52,

  toothPx: 3.5,
  toothContrast: 0.55,

  widthMul: 1.4,

  dustWidthMul: 3.0,
  dustAlpha: 0.07,

  grain: 0.045,
  grainHz: 24,
  vignette: 0.32,
  bloomStrength: 0.12,
  bloomRadius: 0.55,
  bloomThreshold: 0.5,

  fov: 38,
  dprCap: 1.6,

  ground: 'slate',
};

/**
 * Prototype look (?look=vinci): iron gall ink on aged parchment. Thinner,
 * steadier lines, subtler tooth, no bloom, the dust halo tightened into a
 * faint ink bleed, flag colors dropped to sanguine and a muted ultramarine.
 */
const VINCI: LookParams = {
  chalkWhite: '#3d2f1f',
  board: '#e9dbbd',
  flagRed: '#a64b32',
  flagBlue: '#3f5a8a',

  boilHz: 6,
  boilAmpPct: 0.0011,

  hatchAngleRad: -0.52,

  toothPx: 3.0,
  toothContrast: 0.28,

  widthMul: 0.9,

  dustWidthMul: 1.55,
  dustAlpha: 0.05,

  grain: 0.03,
  grainHz: 24,
  vignette: 0.14,
  bloomStrength: 0,
  bloomRadius: 0.55,
  bloomThreshold: 0.5,

  fov: 38,
  dprCap: 1.6,

  ground: 'parchment',
};

/** Resolved once at module init; guarded so tooling can import this file. */
function resolveLookName(): LookName {
  if (typeof window === 'undefined') return 'chalk';
  return new URLSearchParams(window.location.search).get('look') === 'vinci' ? 'vinci' : 'chalk';
}

export const LOOK_NAME: LookName = resolveLookName();

export const LOOK: LookParams = LOOK_NAME === 'vinci' ? VINCI : CHALK;

/* ------------------------------------------------------------------ */
/* Strokes: the one drawing primitive in the film                      */
/* ------------------------------------------------------------------ */

export interface StrokeStyle {
  /** Ribbon width in CSS px at DPR 1. */
  widthPx: number;
  /** End taper amount 0..1. */
  taper: number;
  /** Baked low-frequency wobble amplitude, world units. */
  wobbleAmp: number;
  /** Wobble frequency along the stroke. */
  wobbleFreq: number;
  /** Draw the wide faint dust halo under the chalk pass. */
  dust: boolean;
  /** Chalk white by default. The flag overrides with flagRed / flagBlue. */
  color: string;
  /**
   * True only for the flag: bypasses the single-value discipline.
   * Everything else in the film must leave this false.
   */
  colorBypass: boolean;
  /**
   * Depth-test this set against scene depth. Off by default (drawings
   * composite like ink on glass). The flythrough plane turns it on so the
   * tree's invisible depth occluder can hide it: lines stop at the crown's
   * contour the way a hand would stop drawing them.
   */
  depthTest: boolean;
  seed: number;
}

export const DEFAULT_STROKE_STYLE: StrokeStyle = {
  widthPx: 2.6,
  taper: 0.35,
  wobbleAmp: 0.05,
  wobbleFreq: 1.7,
  dust: true,
  color: LOOK.chalkWhite,
  colorBypass: false,
  depthTest: false,
  seed: 1,
};

export interface StrokeHandle {
  index: number;
}

export interface AddStrokeOptions {
  widthPx?: number;
  color?: string;
  /**
   * Window of the set's draw progress in which this stroke draws itself,
   * in set-draw space [0..1]. Default: staggered by insertion order.
   */
  drawWindow?: [number, number];
  /**
   * Strokes sharing a boilSeed share their boil jitter phase, so a dense patch
   * re-registers as one unit instead of each line shimmering on its own.
   * Default: the stroke's own seed, which is the original per-stroke behavior.
   */
  boilSeed?: number;
}

export interface Viewport {
  w: number;
  h: number;
  dpr: number;
}

/**
 * A batch of chalk strokes sharing one style, one or two draw calls total
 * (chalk pass plus optional dust pass). Built once, driven by setDraw.
 */
export interface StrokeSetApi {
  /** Contains the chalk mesh and the dust mesh. Add to a scene group. */
  object3d: THREE.Object3D;
  strokeCount: number;
  /** points are world-space positions along the stroke, in draw order. */
  addStroke(points: THREE.Vector3[], opts?: AddStrokeOptions): StrokeHandle;
  /** Draw-on progress 0..1 across the whole set, staggered per stroke. */
  setDraw(p: number): void;
  setOpacity(alpha: number): void;
  /** Per frame: boil time, camera, and viewport for px-correct widths. */
  update(timeSec: number, camera: THREE.PerspectiveCamera, viewport: Viewport): void;
  clear(): void;
  dispose(): void;
}

export interface StrokeSetOptions {
  style?: Partial<StrokeStyle>;
  /** Preallocated capacity. Growing past it is allowed but reallocates. */
  maxPoints?: number;
  look: LookParams;
}

/* ------------------------------------------------------------------ */
/* Scenes                                                              */
/* ------------------------------------------------------------------ */

export interface FilmContext {
  three: {
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
  };
  look: LookParams;
  /** Seconds since boot, for the boil only. Never drive motion with it. */
  time(): number;
  viewport(): Viewport;
  /** Factory wired by the runtime to lib/strokes.createStrokeSet. */
  makeStrokeSet(opts?: { style?: Partial<StrokeStyle>; maxPoints?: number }): StrokeSetApi;
}

export interface FilmScene {
  id: SceneId;
  /** Build geometry, add groups to ctx.three.scene. Called once, lazily. */
  mount(ctx: FilmContext): void;
  /**
   * local: 0..1 inside this scene's range. global: film t.
   * Must be a pure function of its inputs; no internal clocks.
   */
  update(local: number, global: number, ctx: FilmContext): void;
  setVisible(v: boolean): void;
  dispose(): void;
}

/* ------------------------------------------------------------------ */
/* Post                                                                */
/* ------------------------------------------------------------------ */

export interface PostApi {
  render(timeSec: number): void;
  resize(v: Viewport): void;
  dispose(): void;
}
