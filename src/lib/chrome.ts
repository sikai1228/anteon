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
const BOX_TOP = 84;
const BOX_INSET = 17;
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

let lastE = -1;

let lastK = -1;
let atStart = true;
let skipTimer = 0;

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

  // The exit mirrors the entrance: the white site block enters as a box with
  // the film box's side breathing and grows to full width as it rises across
  // the final viewport of scroll.
  const e = ease(clamp01((window.scrollY - span()) / window.innerHeight + 1));
  const re = Math.round(e * 1000) / 1000;
  if (re !== lastE) {
    lastE = re;
    const closed = 1 - re;
    rootStyle.setProperty('--site-inset', (BOX_INSET * closed).toFixed(1) + 'px');
    rootStyle.setProperty('--site-radius', (BOX_RADIUS * closed).toFixed(1) + 'px');
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

if (!document.documentElement.classList.contains('static')) {
  skipEl?.addEventListener('click', () => {
    window.scrollTo(0, span());
  });
  requestAnimationFrame(frame);
} else {
  skipEl?.classList.add('gone');
}
