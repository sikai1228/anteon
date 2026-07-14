/**
 * Captions and the color fade. Beats are built from FILM.captions plus the
 * strings in COPY; opacity eases in and out of each beat window, the opening
 * quote drifts up as it leaves, and #fade washes the frame per FILM.fades.
 * In static mode the same beats stack visibly, styled by styles.css.
 */

import { FILM } from '../film.config';
import { COPY } from '../copy';
import { LOOK } from './types';

export interface CaptionsApi {
  update(p: number): void;
  buildStatic(): void;
}

/** Fade in and out over this fraction of each beat window. */
const EDGE_FRAC = 0.18;
/** Upward drift of the quote as it exits, px. */
const QUOTE_DRIFT = 14;

interface Beat {
  key: string;
  el: HTMLElement | null;
  tIn: number;
  tOut: number;
  edge: number;
  /** True for the opening quote: already on at the film start, no fade in. */
  holdFromStart: boolean;
  isQuote: boolean;
  text: string;
  card: boolean;
  small: boolean;
  lastA: number;
  lastDy: number;
}

interface Fade {
  tIn: number;
  tPeak: number;
  tOut: number;
  r: number;
  g: number;
  b: number;
}

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

/** Cubic (smoothstep) ease, t in 0..1. */
function easeCubic(t: number): number {
  const c = clamp01(t);
  return c * c * (3 - 2 * c);
}

function parseHex(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export function createCaptions(): CaptionsApi {
  const captionsEl = document.getElementById('captions');
  const quoteEl = document.getElementById('quote');
  const fadeEl = document.getElementById('fade');

  const beats: Beat[] = [];
  for (const c of FILM.captions) {
    if (c.enabled === false) continue;
    const isQuote = c.el === 'quote';
    const w = c.tOut - c.tIn;
    beats.push({
      key: c.key,
      el: null,
      tIn: c.tIn,
      tOut: c.tOut,
      edge: EDGE_FRAC * (w > 0 ? w : 0),
      holdFromStart: c.tIn <= 0,
      isQuote,
      text: isQuote ? '' : COPY.captions[c.key as keyof typeof COPY.captions] ?? '',
      card: c.card === true,
      small: c.small === true,
      lastA: -1,
      lastDy: 0,
    });
  }

  const fades: Fade[] = FILM.fades.map((f) => {
    const [r, g, b] = parseHex(LOOK[f.color]);
    return { tIn: f.tIn, tPeak: f.tPeak, tOut: f.tOut, r, g, b };
  });

  function makeCaption(b: Beat): HTMLElement {
    const div = document.createElement('div');
    let cls = 'caption';
    if (b.card) cls += ' card';
    if (b.small) cls += ' small';
    div.className = cls;
    const span = document.createElement('span');
    span.textContent = b.text;
    div.appendChild(span);
    return div;
  }

  let built = false;
  function buildDynamic(): void {
    for (const b of beats) {
      if (b.isQuote) {
        b.el = quoteEl;
        continue;
      }
      const div = makeCaption(b);
      captionsEl?.appendChild(div);
      b.el = div;
    }
    built = true;
  }

  function beatOpacity(b: Beat, p: number): number {
    if (p >= b.tOut) return 0;
    const outStart = b.tOut - b.edge;
    if (b.holdFromStart) {
      // Already on at the film start (the pre-painted quote); only fades out.
      if (p < 0) return 0;
      if (p >= outStart && b.edge > 0) return easeCubic((b.tOut - p) / b.edge);
      return 1;
    }
    if (p <= b.tIn) return 0;
    if (b.edge <= 0) return 1;
    const inEnd = b.tIn + b.edge;
    if (p < inEnd) return easeCubic((p - b.tIn) / b.edge);
    if (p > outStart) return easeCubic((b.tOut - p) / b.edge);
    return 1;
  }

  function fadeOpacity(f: Fade, p: number): number {
    if (p <= f.tIn || p >= f.tOut) return 0;
    if (p < f.tPeak) {
      const w = f.tPeak - f.tIn;
      return w > 0 ? easeCubic((p - f.tIn) / w) : 1;
    }
    const w = f.tOut - f.tPeak;
    return w > 0 ? easeCubic((f.tOut - p) / w) : 0;
  }

  let lastFadeA = -1;
  let lastFadeCol = '';
  function updateFade(p: number): void {
    if (!fadeEl) return;
    // Composite the active fades, later beats over earlier ones.
    let oR = 0;
    let oG = 0;
    let oB = 0;
    let oA = 0;
    for (const f of fades) {
      const ca = fadeOpacity(f, p);
      if (ca <= 0) continue;
      const na = ca + oA * (1 - ca);
      if (na > 0) {
        const k = oA * (1 - ca);
        oR = (f.r * ca + oR * k) / na;
        oG = (f.g * ca + oG * k) / na;
        oB = (f.b * ca + oB * k) / na;
      }
      oA = na;
    }
    const ra = oA <= 0.001 ? 0 : Math.round(oA * 1000) / 1000;
    if (ra === 0) {
      if (lastFadeA !== 0) {
        fadeEl.style.opacity = '0';
        lastFadeA = 0;
      }
      return;
    }
    const col = `rgb(${Math.round(oR * 255)}, ${Math.round(oG * 255)}, ${Math.round(oB * 255)})`;
    if (col !== lastFadeCol) {
      fadeEl.style.backgroundColor = col;
      lastFadeCol = col;
    }
    if (ra !== lastFadeA) {
      fadeEl.style.opacity = String(ra);
      lastFadeA = ra;
    }
  }

  function update(p: number): void {
    if (!built) buildDynamic();

    for (const b of beats) {
      const el = b.el;
      if (!el) continue;
      const a = beatOpacity(b, p);

      if (b.isQuote) {
        const outStart = b.tOut - b.edge;
        let dy = 0;
        if (p >= outStart && p < b.tOut) dy = -(1 - a) * QUOTE_DRIFT;
        const rdy = Math.round(dy * 100) / 100;
        if (rdy !== b.lastDy) {
          el.style.transform = rdy !== 0 ? `translateY(${rdy}px)` : '';
          b.lastDy = rdy;
        }
      }

      const ra = a >= 0.999 ? 1 : a <= 0.001 ? 0 : Math.round(a * 1000) / 1000;
      if (ra !== b.lastA) {
        el.style.opacity = ra === 1 ? '1' : ra === 0 ? '0' : String(ra);
        b.lastA = ra;
      }
    }

    updateFade(p);
  }

  function buildStatic(): void {
    // The quote reads first in the stacked transcript.
    if (quoteEl && captionsEl && captionsEl.parentElement) {
      captionsEl.parentElement.insertBefore(quoteEl, captionsEl);
    }
    for (const b of beats) {
      if (b.isQuote) continue;
      captionsEl?.appendChild(makeCaption(b));
    }
  }

  return { update, buildStatic };
}
