/**
 * The landing chrome: the white shell, the box expansion, and the skip
 * control. Self-contained on purpose (own scroll read, own frame loop) so
 * the landing works independently of the film runtime. The box's insets,
 * radius, and the header's opacity collapse to zero across the quote's
 * exit window, pure from scroll, and return if the viewer scrolls back.
 * The skip button is landing-only: it dismisses 0.3 seconds after the
 * first scroll and never comes back.
 */

import { initCellGame } from './cellgame';
import { initCompilerDiagram } from './compilerdiagram';
import { initTerminalDemo } from './demo';
import { initGlobe } from './globe';
import { initLibraryMore } from './librarymore';
import { wirePrefs } from './prefs';

const EXPAND_IN = 0.015;
const EXPAND_OUT = 0.06;
const SKIP_DISMISS_MS = 300;

// The box geometry and the ride's length come from tokens.css, so the token
// sheet stays the single source; the fallbacks repeat its shipped values.
const tokens = getComputedStyle(document.documentElement);

function tokenNum(name: string, fallback: number): number {
  const v = parseFloat(tokens.getPropertyValue(name));
  return Number.isFinite(v) ? v : fallback;
}

const BOX_TOP = tokenNum('--chrome-header', 84);
const BOX_INSET = tokenNum('--chrome-inset', 17);
const BOX_RADIUS = tokenNum('--radius-frame', 10);
/** The climbing boxes' corner: the film box's own radius is too small to read
 * white on chalk, so these carry their own, larger one. */
const RISE_RADIUS = tokenNum('--radius-rise', 24);
const RIDE_MS = tokenNum('--speed-ride', 1.5) * 1000;

/** Where in a box's climb it starts to widen. Before this it holds its length
 * and only rises; after it, it rises and widens together. Two moves read as
 * two moves; widening from the first pixel reads as a smear. */
const EXPAND_AT = 0.8;

/** Where the corners start to square off. Later than the widening: a box that
 * loses its corners the moment it starts growing never reads as a box at all.
 * It stays visibly round through the widening and goes square only as it
 * lands, so the deround is the landing rather than a slow leak out of it. */
const SQUARE_AT = 0.95;

/** A box's width, 0 at its resting length, 1 at full bleed, across the climb. */
function widen(r: number): number {
  return ease((r - EXPAND_AT) / (1 - EXPAND_AT));
}

/** A box's corners, 0 fully round, 1 square, across the climb. */
function square(r: number): number {
  return ease((r - SQUARE_AT) / (1 - SQUARE_AT));
}

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

function ease(t: number): number {
  const c = clamp01(t);
  return c * c * (3 - 2 * c);
}

const rootStyle = document.documentElement.style;
const filmEl = document.getElementById('film');
const siteEl = document.getElementById('site');
const skipEl = document.getElementById('skip');

let lastE = -1;
let lastI = -1;

let lastK = -1;
let atStart = true;
let pinned = false;
let bedded = false;
let skipTimer = 0;

function span(): number {
  return Math.max(1, (filmEl ? filmEl.offsetHeight : 1) - window.innerHeight);
}

/** The page's own top: the introduction rests at the film's end and holds a
 * screen of its own, so the page begins one screen further down. */
function home(): number {
  return span() + window.innerHeight * 2;
}

function frame(): void {
  const p = clamp01(window.scrollY / span());
  const k = ease((p - EXPAND_IN) / (EXPAND_OUT - EXPAND_IN));

  const rk = Math.round(k * 1000) / 1000;
  if (rk !== lastK) {
    lastK = rk;
    const open = 1 - rk;
    rootStyle.setProperty('--box-top', (BOX_TOP * open).toFixed(1) + 'px');
    rootStyle.setProperty('--box-inset', (BOX_INSET * open).toFixed(1) + 'px');
    rootStyle.setProperty('--box-radius', (BOX_RADIUS * open).toFixed(1) + 'px');
    // the border belongs to the landing box only; at full bleed it vanishes
    rootStyle.setProperty('--box-border', open > 0.02 ? '#dedcd5' : 'transparent');
  }

  // Two boxes climb out of the film, one screen apart, on the same rise. The
  // introduction goes first, across the screen right after the film: 0 when its
  // top touches the viewport's bottom, 1 when it reaches the top. Its corners
  // start round like the film box's and square off as it lands.
  const ir = clamp01((window.scrollY - span()) / window.innerHeight);
  const ri = Math.round(ir * 1000) / 1000;
  if (ri !== lastI) {
    lastI = ri;
    rootStyle.setProperty('--intro-inset', (BOX_INSET * (1 - widen(ir))).toFixed(1) + 'px');
    rootStyle.setProperty('--intro-radius', (RISE_RADIUS * (1 - square(ir))).toFixed(1) + 'px');
  }

  // The chalk bed lands the instant the introduction fills the viewport, and
  // stays for everything below. Switched here rather than in CSS because the
  // frame that hides the switch is the one where ir reaches 1: the
  // introduction covers every pixel the bed would repaint.
  const wantBed = ir >= 1;
  if (wantBed !== bedded) {
    bedded = wantBed;
    document.documentElement.classList.toggle('bedded', wantBed);
  }

  // The exit mirrors the entrance: the white site block enters as a box with
  // the film box's side breathing and grows to full width as it rises across
  // its own viewport of scroll, a screen after the introduction's.
  // 0 when the site's top touches the viewport bottom, 1 when it reaches the
  // top: the box's breathing eases out across exactly that climb, and the
  // header's divider draws itself across the climb's last stretch, finishing
  // the instant the page is full.
  const er = clamp01(
    (window.scrollY - span() - window.innerHeight) / window.innerHeight,
  );
  const re = Math.round(er * 1000) / 1000;
  if (re !== lastE) {
    lastE = re;
    rootStyle.setProperty('--site-inset', (BOX_INSET * (1 - widen(er))).toFixed(1) + 'px');
    rootStyle.setProperty('--site-radius', (RISE_RADIUS * (1 - square(er))).toFixed(1) + 'px');
    rootStyle.setProperty('--site-line', ease((er - 0.85) / 0.15).toFixed(3));
  }

  // The climb over, the header stops being sticky and pins. A sticky bar
  // re-seats against the viewport on every scroll step, and a phone's URL bar
  // sliding in and out turns that into visible jitter; a fixed bar at a pixel
  // top never reflows. The pin can only land at the top of the climb, since
  // until then the header has to ride the rising box. At er 1 the site's top is
  // exactly at the viewport's, so the swap costs no jump.
  const wantPin = er >= 1;
  if (wantPin !== pinned) {
    pinned = wantPin;
    siteEl?.classList.toggle('pinned', wantPin);
  }

  // The skip control belongs to the landing: it leaves 0.3 seconds after
  // scrolling begins and returns whenever the viewer is back at the start.
  const nowAtStart = p < 0.002;
  if (nowAtStart !== atStart) {
    atStart = nowAtStart;
    window.clearTimeout(skipTimer);
    if (atStart) {
      skipEl?.classList.remove('gone');
    } else {
      skipTimer = window.setTimeout(() => skipEl?.classList.add('gone'), SKIP_DISMISS_MS);
    }
  }

  requestAnimationFrame(frame);
}

// Each init below stands alone: one throwing must never take down the
// ones after it (a failed init here once blanked the hero wheel, which
// needs its JS to set the clip width). Log the failure and carry on.
function tryInit(name: string, run: () => void): void {
  try {
    run();
  } catch (err) {
    console.error(`[chrome] ${name} init failed:`, err);
  }
}

// The footer preference pills share one wiring with the shell pages, so
// the footer behaves identically on every page.
tryInit('prefs', wirePrefs);

// The hero terminal demo: the split-screen race (no-ops off the landing).
tryInit('terminal demo', initTerminalDemo);

// The idle puff game on the cell grids (no-ops off the landing, off screen,
// and under reduced motion).
tryInit('cell game', initCellGame);

// The library grid's See more: collapses the added rows into a disclosure and
// reveals them once (no-ops off the landing, where the grid is absent).
tryInit('library expand', initLibraryMore);

// The compiler diagram in the #compiler section: AI traffic drawing on the
// knowledge layer (no-ops off the landing, off screen, and under reduced
// motion).
tryInit('compiler diagram', initCompilerDiagram);

// The API section's interactive globe: cobe sphere, city markers, router arcs
// (no-ops off the landing, where the canvas is absent).
tryInit('api globe', initGlobe);

// The hero word wheel, ported from EstateInventor's RotatingWord (a
// Krea-style slot roll): the current and incoming words translate in
// lockstep inside a clipped wrapper whose width is measured per word, so
// each swap reads as one rolling wheel and the centered line glides to its
// new width. Decorative (the wrapper is aria-hidden; a static sr word
// completes the heading). Under reduced motion the wheel never starts and
// the markup's own first word stands. Hidden .hw-src spans carry the word
// list through the i18n catalogs, so the wheel follows locale swaps.
tryInit('hero wheel', () => {
  const wheelEl = document.querySelector<HTMLElement>('.hero-wheel');
  if (!wheelEl || document.documentElement.classList.contains('static')) return;
  const WHEEL_MS = 3400;
  // Must match the CSS roll transition (--speed-settle).
  const ROLL_MS = 300;
  const reducedMq = window.matchMedia('(prefers-reduced-motion: reduce)');
  const sources = [...wheelEl.querySelectorAll<HTMLElement>('.hw-src')];
  let faceEl = wheelEl.querySelector<HTMLElement>('.hw-face');
  if (faceEl && sources.length >= 2 && !reducedMq.matches) {
    let cur = 0;
    let rolling = false;
    let wheelInView = true;

    const measureWord = (text: string): number => {
      const m = document.createElement('span');
      m.className = 'hw-word';
      m.style.position = 'absolute';
      m.style.visibility = 'hidden';
      m.style.whiteSpace = 'nowrap';
      m.textContent = text;
      wheelEl.appendChild(m);
      const w = m.getBoundingClientRect().width;
      m.remove();
      return w;
    };
    const syncWidth = (): void => {
      if (!rolling) wheelEl.style.width = measureWord(sources[cur].textContent ?? '') + 'px';
    };
    syncWidth();
    window.addEventListener('resize', syncWidth);
    document.fonts?.ready.then(syncWidth);
    // After a locale swap, applyDom resets the face to word one; put the
    // wheel back on its current word in the new language and re-measure.
    window.addEventListener('locale-change', () => {
      if (faceEl) faceEl.textContent = sources[cur].textContent;
      syncWidth();
    });

    // Pause the roll while the hero is far off screen.
    new IntersectionObserver(
      (es) => {
        wheelInView = es[0]?.isIntersecting ?? true;
      },
      { rootMargin: '200px' },
    ).observe(wheelEl);

    window.setInterval(() => {
      if (!wheelInView || rolling || reducedMq.matches || !faceEl) return;
      rolling = true;
      const next = (cur + 1) % sources.length;
      const incoming = document.createElement('span');
      incoming.className = 'hw-word hw-incoming';
      incoming.textContent = sources[next].textContent;
      wheelEl.appendChild(incoming);
      wheelEl.style.width = measureWord(incoming.textContent ?? '') + 'px';
      // Double rAF: paint both words at their start transforms first, so the
      // roll has a real from state.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          faceEl?.classList.add('hw-out');
          incoming.classList.add('hw-in');
        });
      });
      window.setTimeout(() => {
        faceEl?.remove();
        incoming.classList.remove('hw-incoming', 'hw-in');
        incoming.classList.add('hw-face');
        faceEl = incoming;
        cur = next;
        rolling = false;
      }, ROLL_MS + 20);
    }, WHEEL_MS);
  }
});

// Clicking the wordmark, in either header, is a hard cut to the landing
// page's top, the same ground the skip ride lands on, not back to the
// film's start. The film runtime answers site-jump with an immediate Lenis
// jump and re-arms the boundary latch; the static shell scrolls directly.
tryInit('wordmark home', () => {
  for (const w of document.querySelectorAll('#wordmark, .site-wordmark, .footer-brand')) {
    w.addEventListener('click', (e) => {
      // The shared chrome renders these as real links home for the shells;
      // on the landing the jump is local, so the navigation is cancelled.
      e.preventDefault();
      if (document.documentElement.classList.contains('static')) {
        window.scrollTo(0, home());
      } else {
        window.dispatchEvent(new CustomEvent('site-jump'));
      }
    });
  }
});

if (!document.documentElement.classList.contains('static')) {
  skipEl?.addEventListener('click', () => {
    // No teleport: race through the whole film in about 1.5 seconds, fast
    // enough to skip, slow enough that every frame flashes past. Skipping the
    // film means skipping its title card too, so the ride lands on the page
    // itself, fully risen, not on the introduction. Any manual scroll cancels.
    const from = window.scrollY;
    const to = home();
    const T = RIDE_MS;
    let cancelled = false;
    const cancel = () => {
      cancelled = true;
    };
    window.addEventListener('wheel', cancel, { once: true, passive: true });
    window.addEventListener('touchstart', cancel, { once: true, passive: true });
    const t0 = performance.now();
    const ride = (now: number) => {
      if (cancelled) return;
      const k = ease(clamp01((now - t0) / T));
      window.scrollTo(0, from + (to - from) * k);
      if (k < 1) requestAnimationFrame(ride);
    };
    requestAnimationFrame(ride);
  });
  requestAnimationFrame(frame);
} else {
  skipEl?.classList.add('gone');
}
