/**
 * The landing chrome: the white shell, the box expansion, and the skip
 * control. Self-contained on purpose (own scroll read, own frame loop) so
 * the landing works independently of the film runtime. The box's insets,
 * radius, and the header's opacity collapse to zero across the quote's
 * exit window, pure from scroll, and return if the viewer scrolls back.
 * The skip button is landing-only: it dismisses 0.3 seconds after the
 * first scroll and never comes back.
 */

const EXPAND_IN = 0.015;
const EXPAND_OUT = 0.06;
const BOX_TOP = 56;
const BOX_INSET = 14;
const BOX_RADIUS = 10;
const SKIP_DISMISS_MS = 300;

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

function ease(t: number): number {
  const c = clamp01(t);
  return c * c * (3 - 2 * c);
}

const rootStyle = document.documentElement.style;
const filmEl = document.getElementById('film');
const skipEl = document.getElementById('skip');

let lastK = -1;
let skipArmed = true;

function span(): number {
  return Math.max(1, (filmEl ? filmEl.offsetHeight : 1) - window.innerHeight);
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

  if (skipArmed && p > 0.002) {
    skipArmed = false;
    window.setTimeout(() => skipEl?.classList.add('gone'), SKIP_DISMISS_MS);
  }

  requestAnimationFrame(frame);
}

if (!document.documentElement.classList.contains('static')) {
  skipEl?.addEventListener('click', () => {
    window.scrollTo(0, span());
  });
  requestAnimationFrame(frame);
} else {
  skipEl?.classList.add('gone');
}
