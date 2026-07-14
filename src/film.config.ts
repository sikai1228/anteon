/**
 * The storyboard as data. This file is the film: retime a beat by editing
 * a number here, nothing else moves. Global t runs 0..1 over the scroll.
 *
 * Beat map (from the brief):
 * 0.00 quote held on black          0.46 match cut: ribs become tread
 * 0.05 sapling draws itself         0.52 sole presses, pull back to print
 * 0.10 tree grows, camera orbits    0.58 lunar wide, distant figure
 * 0.18 apple resolves, caption      0.68 flag rises, the only color
 * 0.22 apple drops                  0.80 push into the color, bleed out
 * 0.26 figure stands                0.90 card: every giant stood on someone
 * 0.30 match cut: fall becomes      0.95 card: your AI shouldn't stand alone
 *      takeoff arc                  1.00 logo, site begins
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

  scenes: [
    { id: 'newton', range: [0.02, 0.315] },
    { id: 'flyer', range: [0.29, 0.48] },
    { id: 'boot', range: [0.455, 0.62] },
    { id: 'moon', range: [0.5, 0.87] },
  ] as SceneDef[],

  captions: [
    { key: 'quoteHold', el: 'quote', tIn: 0.0, tOut: 0.055 },
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
    { t: 0.0, pos: [0, 2.2, 16], target: [0, 3.4, 0], fov: 38 },
    { t: 0.06, pos: [0.6, 2.0, 14.5], target: [0, 3.2, 0] },
    { t: 0.12, pos: [3.2, 4.2, 11.5], target: [0.2, 4.4, 0] },
    { t: 0.18, pos: [2.2, 5.6, 8.0], target: [1.5, 6.3, 0] },
    { t: 0.225, pos: [2.0, 4.2, 8.5], target: [2.4, 3.4, 0] },
    { t: 0.26, pos: [0.8, 1.1, 9.5], target: [3.0, 1.6, 0] },
    { t: 0.3, pos: [1.2, 2.4, 11], target: [2.6, 2.6, 0] },
    { t: 0.315, pos: [56.5, 1.6, 12.5], target: [60, 2.6, 0] },
    { t: 0.4, pos: [57.5, 3.0, 10.5], target: [61, 3.6, 0] },
    { t: 0.44, pos: [59.5, 4.0, 7.5], target: [62, 4.4, 0], roll: 12 },
    { t: 0.465, pos: [61.2, 4.6, 4.6], target: [62.4, 4.7, 0], roll: 78 },
    { t: 0.475, pos: [180, 5.2, 4.4], target: [180, 0.6, 0], roll: 96 },
    { t: 0.5, pos: [180, 4.4, 6.0], target: [180, 0.4, 0], roll: 30 },
    { t: 0.54, pos: [179, 2.6, 9.0], target: [180.6, 0.3, 0], roll: 0 },
    { t: 0.6, pos: [175, 2.4, 16], target: [181, 1.0, 0] },
    { t: 0.68, pos: [176.5, 1.8, 13], target: [183, 1.6, 0] },
    { t: 0.8, pos: [182.2, 1.7, 2.2], target: [183, 1.7, 0], fov: 26 },
    { t: 0.86, pos: [182.6, 1.7, 1.2], target: [183, 1.7, 0], fov: 22 },
    { t: 1.0, pos: [182.6, 1.7, 1.2], target: [183, 1.7, 0], fov: 22 },
  ] as CameraKey[],

  /**
   * The shared parabola. The apple falls along it; the Flyer's takeoff
   * reverses it. Both scenes read these numbers, never their own copies.
   */
  arc: {
    /** Apple release point, in the newton region. */
    start: [1.5, 6.3, 0] as [number, number, number],
    /** Mid control point. */
    apex: [2.4, 6.9, 0] as [number, number, number],
    /** Impact point, next to the seated figure. */
    end: [3.2, 0.35, 0] as [number, number, number],
    /** Scale and placement of the mirrored arc in the flyer region. */
    flyerScale: 3.2,
    flyerLift: 0.4,
  },
};
