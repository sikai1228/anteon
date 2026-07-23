/**
 * The API-database section's globe: a cobe WebGL sphere with a marker at each
 * famous API's home city and a terminal-voice label riding each marker that
 * fades in only while the marker faces the viewer.
 *
 * cobe v2 is consumer-driven: it renders one frame per update() call and keeps
 * no loop of its own, so this module owns the rAF. Colors carry no literals;
 * every one is read from the theme's CSS custom properties at init and again on
 * a theme swap, then handed to the globe as float triples. Labels ride cobe's
 * own CSS anchors (--cobe-{id}) and its facing signal (--cobe-visible-{id}),
 * gated behind @supports so a browser without anchor positioning shows the
 * globe with no labels rather than mispositioned ones.
 *
 * Drag rotates the sphere and throws it with inertia; the pointer owns it while
 * held, the idle auto-spin resumes after. The loop pauses off screen. Under
 * reduced motion the sphere never auto-spins and never fades in, but the drag
 * still answers.
 */

import createGlobe from 'cobe';
import type { COBEOptions } from 'cobe';

/** An API standard, where it was invented, and its year. The chip reads
 *  "name · year" in the site's terminal register (lowercase mono, a spaced middot
 *  like "anteon · engine database"); these never translate, so they live here
 *  rather than in the string catalog. Ordered so Seattle and SF (~1100km apart,
 *  face front together) land on different indices mod 3, so the label stagger
 *  keeps their chips off one line. */
interface Place {
  id: string;
  location: [number, number];
  label: string;
}

const PLACES: Place[] = [
  { id: 'geneva', location: [46.2044, 6.1432], label: 'http · 1989' },
  { id: 'ny', location: [40.7128, -74.006], label: 'fix · 1992' },
  { id: 'seattle', location: [47.6062, -122.3321], label: 'soap · 1998' },
  { id: 'hangzhou', location: [30.2741, 120.1551], label: 'alipay · 2004' },
  { id: 'sf', location: [37.7749, -122.4194], label: 'oauth · 2007' },
  { id: 'nairobi', location: [-1.2864, 36.8172], label: 'm-pesa · 2007' },
  { id: 'london', location: [51.5074, -0.1278], label: 'open banking · 2016' },
  { id: 'bangalore', location: [12.9716, 77.5946], label: 'upi · 2016' },
  { id: 'saopaulo', location: [-23.5505, -46.6333], label: 'pix · 2020' },
];

// A stately drift: the user asked for barely-moving.
const AUTO_ROTATE = 0.0007;
const BASE_THETA = 0.2;
const FRICTION = 0.95;
const STOP = 0.0001;
const THETA_MAX = 0.4;
const DRAG_PHI = 300;
const DRAG_THETA = 1000;
const VEL_PHI = 0.3;
const VEL_THETA = 0.08;
const VEL_CLAMP = 0.15;

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

/** A CSS color string ("#rrggbb" or "rgb()/rgba()") to a cobe [r,g,b] triple in
 *  0..1. Everything the globe renders comes through here, so no color is baked. */
function toRGB(css: string): [number, number, number] {
  const c = css.trim();
  if (c.startsWith('#')) {
    let h = c.slice(1);
    if (h.length === 3) h = h.split('').map((x) => x + x).join('');
    const n = parseInt(h.slice(0, 6), 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }
  const m = c.match(/rgba?\(([^)]+)\)/);
  if (m) {
    const p = m[1].split(',').map((s) => parseFloat(s));
    return [(p[0] || 0) / 255, (p[1] || 0) / 255, (p[2] || 0) / 255];
  }
  return [0, 0, 0];
}

/** Read the live value of a CSS custom property off the root. */
function readVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name);
}

/** Relative luminance of an RGB triple, for choosing the sphere's bright tone
 *  and its dark flag from whichever theme is in force. */
function lum(c: [number, number, number]): number {
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

/** Blend a toward b by t. */
function mix(
  a: [number, number, number],
  b: [number, number, number],
  t: number,
): [number, number, number] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

/** The globe's palette, read fresh from the theme each time it is called.
 *  cobe shades the sphere as base * (mix((1 - land) * lit, land, dark) + 0.1):
 *  with dark 0 the base paints the lit ocean and land falls dark, with dark 1 the
 *  base paints the land and the ocean falls dark. So the base always wants the
 *  theme's BRIGHT tone (paper in light, the light ink in dark), and dark flips
 *  whether that bright tone is the sphere body or the land. Light theme then reads
 *  as a paper sphere with ink land, dark theme the inverse. glow stays paper so
 *  the halo blends into the page. Markers are ink-family and monochrome, no
 *  accent. dark comes from the paper's own luminance, right for the explicit
 *  choice and for system-follow alike. */
function palette(): Partial<COBEOptions> {
  const paper = toRGB(readVar('--paper'));
  const ink = toRGB(readVar('--ink'));
  const isDark = lum(paper) < 0.5;
  // The sphere body takes the theme's brighter tone, nudged a whisper toward ink
  // so a paper sphere still separates from the paper page as a faint porcelain
  // mass (a hair of tone, not gray). In dark theme that tone already is the light
  // ink, so the nudge is a no-op there. Land dot strength and density are carried
  // by mapBrightness and mapSamples on the globe itself, tuned at the final scale.
  const base = mix(lum(paper) >= lum(ink) ? paper : ink, ink, 0.05);
  return {
    baseColor: base,
    markerColor: ink,
    glowColor: paper,
    dark: isDark ? 1 : 0,
  };
}

export function initGlobe(): void {
  const figure = document.querySelector<HTMLElement>('.globe-figure');
  const canvas = figure?.querySelector<HTMLCanvasElement>('.globe-canvas');
  const labelLayer = figure?.querySelector<HTMLElement>('.globe-labels');
  if (!figure || !canvas || !labelLayer) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  // One place sizes the render target. The first real width builds the globe;
  // every change after resizes cobe's backing store to match, so a late CSS
  // settle, a font reflow, or a breakpoint swap re-syncs the buffer to the box
  // rather than stretching a stale one to fit (the mush the retina shot showed).
  // The observer stays alive for the page's life.
  let globe: ReturnType<typeof createGlobe> | null = null;
  let size = 0;
  const sync = (): void => {
    const w = canvas.offsetWidth;
    if (w <= 0 || w === size) return;
    size = w;
    if (!globe) build(size);
    else globe.update({ width: size, height: size });
  };
  const ro = new ResizeObserver(sync);
  ro.observe(canvas);
  // Defer the first build a frame so the quarter-layout CSS has settled before
  // the buffer is sized; a font load can reflow the section too.
  requestAnimationFrame(sync);
  document.fonts?.ready.then(sync);

  function build(initialSize: number): void {
    if (!figure || !canvas || !labelLayer) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    // Rotation: an auto-spin angle, a persistent offset the drag and its inertia
    // fold into, and the live drag delta on top.
    let phi = 0;
    const offset = { phi: 0, theta: 0 };
    const drag = { phi: 0, theta: 0 };
    const vel = { phi: 0, theta: 0 };
    let dragging = false;
    const start = { x: 0, y: 0 };
    const last = { x: 0, y: 0, t: 0 };

    const g = createGlobe(canvas, {
      devicePixelRatio: dpr,
      width: initialSize,
      height: initialSize,
      phi: 0,
      theta: BASE_THETA,
      dark: 0,
      // The soft gauzy falloff at the limb is the sphere's atmosphere, and it is
      // wanted: diffuse stays at the original value and the rim glow is stock (the
      // cobe patch touches only the dot radius). The container's hard pixel cuts,
      // not the sphere edge, define the section boundary.
      diffuse: 1.5,
      // Land-only dots (mapBaseBrightness 0 leaves the oceans blank) as a fine
      // halftone. The dot radius is shrunk in a cobe patch so a moderate count of
      // dots stays clearly separated rather than merging into a gray mass; a
      // lighter mapBrightness keeps the fine grain delicate.
      mapSamples: 28000,
      mapBrightness: 7,
      mapBaseBrightness: 0,
      baseColor: [0, 0, 0],
      markerColor: [0, 0, 0],
      glowColor: [0, 0, 0],
      opacity: 0.7,
      markerElevation: 0.01,
      // size 0 makes cobe draw nothing for the marker (its quad degenerates), but
      // the anchor-name and --cobe-visible-{id} vars still come from the marker's
      // location in cobe's projection, so the DOM pin and chip keep their anchor.
      // The pin is a clean DOM circle instead: a cobe-drawn marker lights lattice
      // cells and fuses with the fine halftone into a blob.
      markers: PLACES.map((p) => ({ location: p.location, size: 0, id: p.id })),
    });
    globe = g;
    // Paint the real, theme-derived palette in at once (createGlobe needs the
    // shape of every field up front; the colors above are placeholders).
    g.update(palette());

    // One label per marker. Each reads cobe's own facing signal for that id
    // through --v, so the shared class fades it in as the marker rounds to front.
    // cobe emits its 1px marker-anchor divs inside the figure, so the chips resolve
    // their anchors against the figure directly, no move needed.
    const supportsAnchor =
      typeof CSS !== 'undefined' && CSS.supports && CSS.supports('position-anchor: --x');
    if (supportsAnchor) {
      PLACES.forEach((p, i) => {
        // A clean DOM pin sitting on the marker's anchor point: an ink dot with a
        // paper ring so it never merges with the halftone beneath it. It fades on
        // the same --cobe-visible-{id} signal as the chip, so pin and chip arrive
        // together.
        const pin = document.createElement('span');
        pin.className = 'globe-pin';
        pin.style.setProperty('position-anchor', '--cobe-' + p.id);
        pin.style.setProperty('--pv', 'var(--cobe-visible-' + p.id + ', 0)');
        labelLayer.append(pin);

        const el = document.createElement('span');
        el.className = 'globe-label';
        el.textContent = p.label;
        el.style.setProperty('position-anchor', '--cobe-' + p.id);
        el.style.setProperty('--v', 'var(--cobe-visible-' + p.id + ', 0)');
        // A fixed per-marker lift so neighbours that face front together stagger up
        // instead of stacking on one line.
        el.style.setProperty('--lift', (i % 3) * 16 + 'px');
        labelLayer.append(el);
      });
    }

    let raf = 0;
    let faded = false;
    const frame = (): void => {
      raf = requestAnimationFrame(frame);
      if (document.hidden) return;
      if (!dragging) {
        if (!reduce.matches) phi += AUTO_ROTATE;
        offset.phi += vel.phi;
        offset.theta += vel.theta;
        vel.phi *= FRICTION;
        vel.theta *= FRICTION;
        if (Math.abs(vel.phi) < STOP) vel.phi = 0;
        if (Math.abs(vel.theta) < STOP) vel.theta = 0;
        if (offset.theta > THETA_MAX) offset.theta += (THETA_MAX - offset.theta) * 0.1;
        else if (offset.theta < -THETA_MAX) offset.theta += (-THETA_MAX - offset.theta) * 0.1;
      }
      g.update({
        phi: phi + offset.phi + drag.phi,
        theta: BASE_THETA + offset.theta + drag.theta,
      });
    };

    // The loop only runs while the section is on screen; the landing already
    // drives Lenis and the film every frame, so an off-screen globe stands down.
    // The sphere fades up the first time it is seen (instant under reduced
    // motion, where the stylesheet drops the transition).
    const io = new IntersectionObserver(
      (entries) => {
        const seen = entries[0]?.isIntersecting ?? false;
        if (seen && !faded) {
          faded = true;
          canvas.classList.add('is-in');
        }
        if (seen && !raf) raf = requestAnimationFrame(frame);
        else if (!seen && raf) {
          cancelAnimationFrame(raf);
          raf = 0;
        }
      },
      { threshold: 0.05 },
    );
    io.observe(figure);

    // Drag: the pointer takes the sphere on press, moves it under the cursor, and
    // throws it on release. Moves listen on the window so a drag off the canvas
    // still tracks; touch-action on the canvas keeps Lenis out of it.
    canvas.addEventListener('pointerdown', (e) => {
      dragging = true;
      start.x = e.clientX;
      start.y = e.clientY;
      last.x = e.clientX;
      last.y = e.clientY;
      last.t = e.timeStamp;
      vel.phi = 0;
      vel.theta = 0;
      canvas.style.cursor = 'grabbing';
    });
    window.addEventListener(
      'pointermove',
      (e) => {
        if (!dragging) return;
        drag.phi = (e.clientX - start.x) / DRAG_PHI;
        drag.theta = (e.clientY - start.y) / DRAG_THETA;
        const frames = Math.max((e.timeStamp - last.t) / 16.6667, 0.5);
        vel.phi = clamp(((e.clientX - last.x) * VEL_PHI) / (DRAG_PHI * frames), -VEL_CLAMP, VEL_CLAMP);
        vel.theta = clamp(((e.clientY - last.y) * VEL_THETA) / (DRAG_THETA * frames), -VEL_CLAMP, VEL_CLAMP);
        last.x = e.clientX;
        last.y = e.clientY;
        last.t = e.timeStamp;
      },
      { passive: true },
    );
    window.addEventListener('pointerup', () => {
      if (!dragging) return;
      dragging = false;
      offset.phi += drag.phi;
      offset.theta += drag.theta;
      drag.phi = 0;
      drag.theta = 0;
      canvas.style.cursor = 'grab';
    });

    // Repaint the palette whenever the theme flips, live: the explicit pill sets
    // data-theme, and system-follow flips the media query. Either way, re-derive.
    const repaint = (): void => g.update(palette());
    new MutationObserver(repaint).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', repaint);

    // Teardown, for a future SPA route that unmounts the section. Not reached on
    // the one-page landing, but the globe and its loop should never outlive it.
    (figure as HTMLElement & { destroy?: () => void }).destroy = () => {
      if (raf) cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      g.destroy();
    };
  }
}
