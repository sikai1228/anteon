/**
 * Captions and the color fade. Anchored beats pin to composition-aware spots
 * inside the stage box; every built caption reveals word by word, a liquid pour
 * driven purely by scroll, under a slow whole-caption float. The opening quote
 * rides up off the top instead, and #fade washes the frame per FILM.fades. In
 * static mode the beats stack as plain text, styled by styles.css.
 */

import { FILM } from '../film.config';
import type { Catalog } from '../i18n/catalogs';
import { msg } from '../i18n/i18n';
import { LOOK } from './types';

export interface CaptionsApi {
  update(p: number): void;
  buildStatic(): void;
}

/** Fade edge as a fraction of each beat window. */
const EDGE_FRAC = 0.18;
/** Hold the quote still until this p, then it rides up and off the top. */
const QUOTE_HOLD_END = 0.015;
/** Clearance above the top once the quote has fully exited, viewport fraction. */
const QUOTE_EXIT_MARGIN = 0.04;
/** Word stagger as a fraction of the fade edge: anchored lines vs heavier cards. */
const STAGGER_ANCHORED = 0.6;
const STAGGER_CARD = 0.8;
/** Each word rises from this far below as it pours in, em. */
const WORD_RISE_EM = 0.35;
/** The whole caption drifts up this far across its window, em. */
const FLOAT_EM = 0.25;
/** Default max line width for anchored captions, ch. */
const DEFAULT_MAXCH = 24;
/** The camera keys stage against this aspect; the stage box matches it. */
const REF_ASPECT = FILM.refAspect;

interface Word {
  el: HTMLElement;
  /** Position along the line, 0..1 (0 for a lone word). */
  r: number;
  lastA: number;
  lastRise: number;
}

interface Beat {
  key: string;
  el: HTMLElement | null;
  spanEl: HTMLElement | null;
  words: Word[];
  tIn: number;
  tOut: number;
  edge: number;
  isQuote: boolean;
  isAnchored: boolean;
  isCard: boolean;
  /** No exit and no float: the beat holds where it poured. */
  holds: boolean;
  small: boolean;
  /** Anchor fractions are of the viewport, hugging the physical frame. */
  screen: boolean;
  anchor: [number, number] | null;
  align: 'left' | 'center' | 'right';
  /** translateX for the align edge, applied with the anchor. */
  txPct: string;
  maxCh: number;
  /** Word-start spread and per-word fade duration, in p units (set at build). */
  spread: number;
  wordDur: number;
  text: string;
  lastFloat: number;
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

function round2(x: number): number {
  return Math.round(x * 100) / 100;
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
    const anchor = c.anchor ?? null;
    const align = c.align ?? 'center';
    const w = c.tOut - c.tIn;
    beats.push({
      key: c.key,
      el: null,
      spanEl: null,
      words: [],
      tIn: c.tIn,
      tOut: c.tOut,
      edge: EDGE_FRAC * (w > 0 ? w : 0),
      isQuote,
      isAnchored: anchor !== null,
      isCard: c.card === true,
      holds: c.hold === true,
      small: c.small === true,
      screen: c.screen === true,
      anchor,
      align,
      txPct: align === 'left' ? '0' : align === 'right' ? '-100%' : '-50%',
      maxCh: c.maxCh ?? DEFAULT_MAXCH,
      spread: 0,
      wordDur: 0,
      text: isQuote ? '' : msg()[c.key as keyof Catalog] ?? '',
      lastFloat: NaN,
      lastDy: 0,
    });
  }

  const fades: Fade[] = FILM.fades.map((f) => {
    const [r, g, b] = parseHex(LOOK[f.color]);
    return { tIn: f.tIn, tPeak: f.tPeak, tOut: f.tOut, r, g, b };
  });

  // The stage box is the centered ref-aspect region the camera fills; anchored
  // captions pin inside it. The quote's exit needs the viewport and its content
  // height. All cached here and refreshed on resize so update() reads no layout.
  const quoteBlock = quoteEl?.querySelector<HTMLElement>('blockquote') ?? null;
  const quoteCap = quoteEl?.querySelector<HTMLElement>('figcaption') ?? null;
  let viewportH = window.innerHeight;
  let viewportW = window.innerWidth;
  let contentH = 0;
  let boxW = 0;
  let boxH = 0;
  let boxLeft = 0;

  function applyAnchor(b: Beat): void {
    const el = b.el;
    if (!el || !b.anchor) return;
    // Screen-relative beats hug the physical frame (fractions of the
    // viewport); stage beats pin inside the centered composition box.
    if (b.screen) {
      el.style.left = round2(b.anchor[0] * viewportW) + 'px';
      el.style.top = round2(b.anchor[1] * viewportH) + 'px';
    } else {
      el.style.left = round2(boxLeft + b.anchor[0] * boxW) + 'px';
      el.style.top = round2(b.anchor[1] * boxH) + 'px';
    }
    el.style.textAlign = b.align;
  }

  function measureStage(): void {
    viewportH = window.innerHeight;
    viewportW = window.innerWidth;
    const vw = viewportW;
    boxW = Math.min(vw, viewportH * REF_ASPECT);
    boxH = viewportH;
    boxLeft = (vw - boxW) / 2;
    if (quoteBlock && quoteCap) {
      // offsetTop and offsetHeight are relative to the positioned #quote, so
      // they are unaffected by any transform already applied to it.
      contentH = quoteCap.offsetTop + quoteCap.offsetHeight - quoteBlock.offsetTop;

      // Right-align the attribution to the quote's INK, not its box: with
      // balanced wrapping the box is wider than the longest rendered line, so
      // measure the line boxes and pad the attribution's right edge to meet
      // the widest line exactly.
      const range = document.createRange();
      range.selectNodeContents(quoteBlock);
      let maxRight = -Infinity;
      const rects = range.getClientRects();
      for (let i = 0; i < rects.length; i++) {
        if (rects[i].height > 0 && rects[i].right > maxRight) maxRight = rects[i].right;
      }
      const blockRight = quoteBlock.getBoundingClientRect().right;
      if (maxRight > -Infinity && blockRight > maxRight) {
        quoteCap.style.paddingRight = round2(blockRight - maxRight) + 'px';
      } else {
        quoteCap.style.paddingRight = '0px';
      }
    } else if (quoteEl) {
      contentH = quoteEl.offsetHeight;
    } else {
      contentH = viewportH;
    }
    for (const b of beats) {
      if (b.isAnchored && b.el) applyAnchor(b);
    }
  }

  function buildWords(b: Beat, container: HTMLElement): void {
    const parts = b.text.split(/\s+/).filter((s) => s.length > 0);
    const n = parts.length;
    for (let i = 0; i < n; i++) {
      if (i > 0) container.appendChild(document.createTextNode(' '));
      const wEl = document.createElement('span');
      wEl.className = 'w';
      wEl.textContent = parts[i];
      container.appendChild(wEl);
      b.words.push({ el: wEl, r: n > 1 ? i / (n - 1) : 0, lastA: -1, lastRise: -1 });
    }
    const frac = b.isCard ? STAGGER_CARD : STAGGER_ANCHORED;
    b.spread = n > 1 ? frac * b.edge : 0;
    b.wordDur = b.edge - b.spread;
  }

  function makeCaptionLiquid(b: Beat): HTMLElement {
    const div = document.createElement('div');
    let cls = 'caption';
    if (b.isAnchored) cls += ' anchored';
    if (b.isCard) cls += ' card';
    if (b.small) cls += ' small';
    div.className = cls;
    div.style.opacity = '1';
    const span = document.createElement('span');
    if (b.isAnchored) {
      // Constrain the line on the span itself so the ch unit tracks the rendered
      // font size, not the smaller inherited size of the block element.
      span.style.display = 'inline-block';
      span.style.maxWidth = b.maxCh + 'ch';
    }
    buildWords(b, span);
    div.appendChild(span);
    b.spanEl = span;
    return div;
  }

  let built = false;
  let staticBuilt = false;
  let lastP = 0;
  function buildDynamic(): void {
    for (const b of beats) {
      if (b.isQuote) {
        b.el = quoteEl;
        continue;
      }
      const div = makeCaptionLiquid(b);
      captionsEl?.appendChild(div);
      b.el = div;
    }
    measureStage();
    window.addEventListener('resize', measureStage);
    built = true;
  }

  /**
   * Per-word envelope: word r fades in over its own slot, staggered across the
   * first part of the edge (word 0 first, last word landing as the edge ends),
   * and out in reverse. The min of the two eased ramps gives the plateau.
   */
  function wordAlpha(b: Beat, r: number, p: number): number {
    if (p <= b.tIn) return 0;
    // A holding beat has an entrance and no exit: once poured it stays lit for
    // the rest of the film, including past its own window.
    if (p >= b.tOut) return b.holds ? 1 : 0;
    const dd = b.wordDur > 0 ? b.wordDur : b.edge;
    if (dd <= 0) return 1;
    const si = r * b.spread;
    const aIn = easeCubic((p - b.tIn - si) / dd);
    if (b.holds) return aIn;
    const aOut = easeCubic((b.tOut - p - si) / dd);
    return aIn < aOut ? aIn : aOut;
  }

  function updateLiquid(b: Beat, p: number): void {
    const el = b.el;
    if (!el) return;
    // Whole-caption float, linear across the window, on the positioned element.
    // A holding beat sits still instead: the box that rises over it is the only
    // thing that should move.
    const floatEm = b.holds ? 0 : -FLOAT_EM * clamp01((p - b.tIn) / (b.tOut - b.tIn));
    const rf = round2(floatEm);
    if (rf !== b.lastFloat) {
      if (b.isAnchored) {
        el.style.transform =
          rf !== 0
            ? `translate(${b.txPct}, calc(-50% - ${-rf}em))`
            : `translate(${b.txPct}, -50%)`;
      } else {
        el.style.transform = rf !== 0 ? `translateY(${rf}em)` : '';
      }
      b.lastFloat = rf;
    }
    // Per-word pour: opacity and a small settling rise, both eased and from p.
    for (const wd of b.words) {
      const a = wordAlpha(b, wd.r, p);
      const ra = a >= 0.999 ? 1 : a <= 0.001 ? 0 : round2(a);
      if (ra !== wd.lastA) {
        wd.el.style.opacity = ra === 1 ? '1' : ra === 0 ? '0' : String(ra);
        wd.lastA = ra;
      }
      const rise = round2((1 - a) * WORD_RISE_EM);
      if (rise !== wd.lastRise) {
        wd.el.style.transform = rise !== 0 ? `translateY(${rise}em)` : '';
        wd.lastRise = rise;
      }
    }
  }

  function updateQuote(b: Beat, p: number): void {
    const el = b.el;
    if (!el) return;
    // The quote leads the film, then rides up and off the top as the drawing
    // appears beneath it, tied to the scroll rather than eased. Opacity stays at
    // 1; it leaves the frame instead of fading in place.
    let dy = 0;
    if (p > QUOTE_HOLD_END) {
      const span = b.tOut - QUOTE_HOLD_END;
      let k = span > 0 ? (p - QUOTE_HOLD_END) / span : 1;
      if (k > 1) k = 1;
      const travel = (viewportH + contentH) / 2 + QUOTE_EXIT_MARGIN * viewportH;
      dy = -k * travel;
    }
    const rdy = Math.round(dy);
    if (rdy !== b.lastDy) {
      el.style.transform = rdy !== 0 ? `translateY(${rdy}px)` : '';
      b.lastDy = rdy;
    }
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
    lastP = p;
    if (!built) buildDynamic();
    for (const b of beats) {
      if (!b.el) continue;
      if (b.isQuote) updateQuote(b, p);
      else updateLiquid(b, p);
    }
    updateFade(p);
    // The landing chrome (box expansion, skip) is owned solely by
    // src/lib/chrome.ts; a second driver here would double-write the vars.
  }

  function makeCaptionStatic(b: Beat): HTMLElement {
    const div = document.createElement('div');
    let cls = 'caption';
    if (b.isCard) cls += ' card';
    if (b.small) cls += ' small';
    div.className = cls;
    const span = document.createElement('span');
    span.textContent = b.text;
    div.appendChild(span);
    b.el = div;
    b.spanEl = span;
    return div;
  }

  function buildStatic(): void {
    // The quote reads first in the stacked transcript; captions are plain text.
    if (quoteEl && captionsEl && captionsEl.parentElement) {
      captionsEl.parentElement.insertBefore(quoteEl, captionsEl);
    }
    for (const b of beats) {
      if (b.isQuote) continue;
      captionsEl?.appendChild(makeCaptionStatic(b));
    }
    staticBuilt = true;
  }

  function refreshText(): void {
    for (const b of beats) {
      if (!b.isQuote) b.text = msg()[b.key as keyof Catalog] ?? '';
    }
  }

  // A live locale swap. applyDom (in the i18n module) has already replaced the
  // quote's own DOM and every chrome string; here the caption engine only
  // rebuilds the caption words, whose text changed, re-measures the stage (the
  // quote's line lengths moved, which the attribution alignment reads), and
  // repaints at the current scroll. In static mode the captions are plain
  // spans, so their text is simply reset.
  function onLocaleChange(): void {
    refreshText();
    if (built) {
      for (const b of beats) {
        if (b.isQuote || !b.spanEl) continue;
        b.spanEl.textContent = '';
        b.words = [];
        buildWords(b, b.spanEl);
        b.lastFloat = NaN;
      }
      measureStage();
      update(lastP);
    } else if (staticBuilt) {
      for (const b of beats) {
        if (b.isQuote || !b.spanEl) continue;
        b.spanEl.textContent = b.text;
      }
    }
  }
  window.addEventListener('locale-change', onLocaleChange);

  return { update, buildStatic };
}
