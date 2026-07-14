/**
 * The storyboard as data. This file is the film: retime a beat by editing
 * a number here, nothing else moves. Global t runs 0..1 over the scroll.
 *
 * Beat map (from the brief):
 * 0.00 quote held on black          0.46 match cut: ribs become tread
 * 0.05 sapling draws itself         0.52 sole presses, pull back to print
 * 0.10 tree grows, camera orbits    0.58 lunar wide, distant figure
 * 0.18 apple resolves, caption      0.68 flag rises, the only color
 * 0.22 apple drops, bonks his head  0.80 push into the color, bleed out
 * 0.26 he rises and picks it up     0.90 card: every giant stood on someone
 * 0.32 the Flyer crosses the sky,   0.95 card: your AI shouldn't stand alone
 *      the camera chases it in      1.00 logo, site begins
 */

import type { CameraKey, CaptionBeat, FadeBeat, SceneDef } from './lib/types';

/** World regions: each link lives at its own x offset, one continuous world. */
export const REGIONS = {
  newton: 0,
  flyer: 60,
  /** The boot and the Moon share ground: the print happens on the regolith. */
  moon: 180,
} as const;

export const FILM = {
  /** Total scroll length. The film's runtime is the user's scroll. */
  scrollLengthVh: 1400,

  /**
   * Camera keys are staged to fill the frame vertically at this aspect.
   * Narrower viewports widen the fov to hold the horizontal composition;
   * wider viewports keep the vertical framing and gain lateral air.
   */
  refAspect: 1.6,

  scenes: [
    { id: 'newton', range: [0.02, 0.34] },
    { id: 'flyer', range: [0.295, 0.48] },
    { id: 'boot', range: [0.455, 0.62] },
    { id: 'moon', range: [0.5, 0.87] },
  ] as SceneDef[],

  captions: [
    { key: 'quoteHold', el: 'quote', tIn: 0.0, tOut: 0.06 },
    { key: 'newton1', tIn: 0.175, tOut: 0.225 },
    { key: 'newton2', tIn: 0.215, tOut: 0.265 },
    { key: 'wrights', tIn: 0.345, tOut: 0.42 },
    { key: 'lilienthal', tIn: 0.4, tOut: 0.45, small: true, enabled: false },
    { key: 'nasa', tIn: 0.515, tOut: 0.575 },
    { key: 'armstrong', tIn: 0.585, tOut: 0.66 },
    { key: 'card1', tIn: 0.885, tOut: 0.935, card: true },
    { key: 'card2', tIn: 0.945, tOut: 0.998, card: true },
  ] as CaptionBeat[],

  /** The flag fills the frame with the film's only color, then black holds. */
  fades: [
    { key: 'flagFill', color: 'flagRed', tIn: 0.775, tPeak: 0.82, tOut: 0.825 },
    { key: 'toBlack', color: 'board', tIn: 0.82, tPeak: 0.865, tOut: 1.1 },
  ] as FadeBeat[],

  /**
   * One camera, one continuous take. Sampled by lib/timeline.
   * Cuts hide inside matched framings at 0.30 and 0.465.
   */
  camera: [
    { t: 0.0, pos: [0.8, 1.6, 7.6], target: [0, 1.5, 0], fov: 38 },
    { t: 0.06, pos: [1.0, 1.7, 7.0], target: [0, 1.7, 0] },
    { t: 0.12, pos: [2.8, 3.2, 9.8], target: [0.1, 3.1, 0] },
    { t: 0.18, pos: [2.2, 5.6, 8.0], target: [1.5, 6.3, 0] },
    { t: 0.225, pos: [1.8, 3.8, 8.0], target: [1.1, 2.4, 0] },
    { t: 0.25, pos: [1.7, 1.5, 6.5], target: [0.85, 1.15, 0] },
    { t: 0.285, pos: [0.6, 1.0, 9.0], target: [1.0, 1.2, 0] },
    { t: 0.31, pos: [1.1, 1.9, 10.3], target: [0.85, 1.7, 0] },
    { t: 0.325, pos: [1.0, 2.8, 10.5], target: [-2.5, 8.0, -16], fov: 36 },
    { t: 0.35, pos: [2.6, 4.6, 9.0], target: [3, 8.9, -12], fov: 34 },
    { t: 0.39, pos: [8.5, 7.6, 2.5], target: [13, 8.3, -6], fov: 32 },
    { t: 0.43, pos: [20.5, 7.5, 3.6], target: [25, 7.2, -2], fov: 31 },
    { t: 0.465, pos: [29.6, 6.7, 3.0], target: [31.8, 6.5, -0.2], roll: 78, fov: 30 },
    { t: 0.475, pos: [180, 5.2, 4.4], target: [180, 0.6, 0], roll: 96 },
    { t: 0.5, pos: [180, 4.4, 6.0], target: [180, 0.4, 0], roll: 30 },
    { t: 0.54, pos: [179, 2.6, 9.0], target: [180.6, 0.3, 0], roll: 0 },
    { t: 0.6, pos: [177.2, 1.25, 7.2], target: [182.2, 1.05, 0] },
    { t: 0.68, pos: [178.6, 1.5, 8.6], target: [183, 1.5, 0] },
    { t: 0.8, pos: [182.2, 1.7, 2.2], target: [183, 1.7, 0], fov: 26 },
    { t: 0.86, pos: [182.6, 1.7, 1.2], target: [183, 1.7, 0], fov: 22 },
    { t: 1.0, pos: [182.6, 1.7, 1.2], target: [183, 1.7, 0], fov: 22 },
  ] as CameraKey[],

  /**
   * The apple's fall. It ends on the seated figure's head, against the
   * trunk; the bounce off his head is authored in the scene.
   */
  arc: {
    /** Apple release point, in the newton region. */
    start: [1.5, 6.3, 0] as [number, number, number],
    /** Mid control point. */
    apex: [1.9, 6.8, 0] as [number, number, number],
    /** Impact point: the crown of the seated figure's head. */
    end: [0.85, 1.12, 0] as [number, number, number],
    /** Legacy of the reversed takeoff arc; unused since the flythrough. */
    flyerScale: 3.2,
    flyerLift: 0.4,
  },

  /**
   * The frame 2 transition: the Flyer crosses the sky behind the Newton
   * frame and the camera chases it until the wing fills the frame at the
   * 0.465 rib presentation. Rows are [t, x, y, z] in world space; the
   * flyer scene interpolates its position from them, and the camera keys
   * above are staged against the same rows.
   */
  flythrough: [
    [0.315, -6, 8.5, -16],
    [0.35, 3, 8.9, -12],
    [0.39, 13, 8.3, -6],
    [0.43, 25, 7.2, -2],
    [0.475, 34, 6.3, 0.2],
  ] as [number, number, number, number][],
};
