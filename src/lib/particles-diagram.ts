/**
 * The particles network in the #compiler section, a living field of nodes and
 * links standing in for the firm's small software. About 70% of the field is
 * green (solved work, shared across the firm) and 30% red, the red seeded into
 * two or three tight clusters (the unsolved one-off scripts every project
 * leaves behind). Links colour by their endpoints: green to green is green,
 * red to red is red, and any mixed pair reads green.
 *
 * The cursor is Anteon. Its grab radius draws green links to the nodes near it
 * and converts the red ones it touches to green for good, so passing over a red
 * cluster dissolves it into the shared green field. A click pushes a few fresh
 * green nodes in at the pointer.
 *
 * The ecology: the red count self-maintains through natural churn, but the
 * pointer's kills are permanent. On a slow ambient cadence one whole red cluster
 * eases to green while a new one forms elsewhere from the nearest greens, so the
 * red quota holds indefinitely and untouched (background weather, not an event).
 * A pointer conversion instead decrements that quota for good and never
 * respawns, so hovering the field down is the only way to reach all green; once
 * the quota hits zero the churn stops and the field stays green until reload.
 *
 * Hand-rolled on a 2D canvas rather than a particle library: the clustered red
 * seeding, the per-endpoint link colour, the grab-to-convert, and the quota
 * bookkeeping all want per-node control that a config-driven library fights, and
 * the file then reads like cellgame.ts and the globe beside it with no runtime
 * dependency added. Every colour comes from the container's scoped
 * --pd-ok / --pd-alert tokens (see styles.css), so both themes read correctly
 * and a theme flip re-reads them live.
 *
 * Gating mirrors compilerdiagram.ts. Under reduced motion the field renders one
 * settled frame and never animates or churns, though the grab and its
 * conversion still answer the pointer and still shrink the quota. Otherwise an
 * IntersectionObserver runs the loop only while the field is on screen, so no
 * churn accrues off screen and a return draws at most one turnover, never a
 * burst; the canvas listens on itself alone and never captures the wheel or
 * touch, so Lenis keeps the page scroll.
 */

import { msg } from '../i18n/i18n';

/* Field make-up. Count tracks the drawable area so a phone is not crowded, but
 * caps near the reference's 140 on a wide screen. Roughly a third is red. */
const AREA_PER_NODE = 3800;
const COUNT_MIN = 40;
const COUNT_MAX = 140;
const RED_FRACTION = 0.3;
/* The red never scatters: it clumps into this many centres, and a red node is
 * born a Gaussian step from one of them, the step scaled to the field's short
 * side so the clumps read at every size. */
const CLUSTER_MIN = 2;
const CLUSTER_MAX = 3;
const CLUSTER_SPREAD = 0.13;

/* Node look and pace, all in CSS pixels and seconds. Calm on purpose. */
const R_MIN = 1;
const R_MAX = 3;
const SPEED_MIN = 12;
const SPEED_MAX = 30;
const BREATHE = 0.9;

/* Reach and weight of the two link kinds. */
const LINK_DIST = 160;
const LINK_ALPHA = 0.5;
const GRAB_DIST = 220;
const GRAB_ALPHA = 0.85;

/* A grabbed red crosses to green in about this long: one over the rate, so
 * 2.6 is a touch under half a second, smooth with no flicker. Natural churn
 * eases slower, so a turnover reads as weather rather than a pointer's kill. */
const CONVERT_RATE = 2.6;
const NATURAL_RATE = 1.4;

/* One ambient cluster turnover every ten to fifteen seconds: slow enough to
 * read as background, and jittered so it never feels metronomic. */
const CHURN_MIN = 10;
const CHURN_MAX = 15;

/* A click pushes this many green nodes in; the field is capped so repeated
 * clicks retire the oldest pushed nodes rather than growing without bound. */
const PUSH_COUNT = 4;
const PUSH_SPEED_MIN = 40;
const PUSH_SPEED_MAX = 90;
const COUNT_HEADROOM = 60;

/* The backing store never exceeds twice CSS resolution, retina without the
 * fill cost of a 3x panel. */
const DPR_CAP = 2;
/* The field must be at least this visible before its motion runs. */
const IN_VIEW = 0.15;
/* A slow frame steps at most this much time, so a return from a hidden tab
 * never teleports the whole field across the box. */
const DT_CAP = 0.05;

interface RGB {
  r: number;
  g: number;
  b: number;
}

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  /** Phase offset for the size and opacity breathing, so no two pulse alike. */
  phase: number;
  /** Current colour: 1 fully red, 0 fully green; it eases toward redTarget. */
  redness: number;
  /** The identity the node is easing toward, 1 red or 0 green. */
  redTarget: 0 | 1;
  /** Redness units per second for the current transition (human vs natural). */
  easeRate: number;
  /** Red cluster id, or -1 when green. A cluster dies and respawns as a unit. */
  cluster: number;
  /** Converted by the pointer: never red again, never counted for a respawn. */
  humanKilled: boolean;
  /** Spawned by a click; the field trims these first when it is over cap. */
  pushed: boolean;
}

interface PdCanvas extends HTMLCanvasElement {
  __pdSnapshot?: () => unknown;
  __pdForceChurn?: () => void;
}

const GREEN_FALLBACK: RGB = { r: 74, g: 143, b: 95 };
const RED_FALLBACK: RGB = { r: 232, g: 80, b: 63 };

/** Parse a scoped token into RGB. Handles #rgb, #rrggbb, and rgb()/rgba(). */
function parseColor(value: string, fallback: RGB): RGB {
  const v = value.trim();
  if (v.startsWith('#')) {
    const h = v.slice(1);
    if (h.length === 3) {
      return {
        r: parseInt(h[0] + h[0], 16),
        g: parseInt(h[1] + h[1], 16),
        b: parseInt(h[2] + h[2], 16),
      };
    }
    if (h.length >= 6) {
      return {
        r: parseInt(h.slice(0, 2), 16),
        g: parseInt(h.slice(2, 4), 16),
        b: parseInt(h.slice(4, 6), 16),
      };
    }
  }
  const nums = v.match(/[\d.]+/g);
  if (nums && nums.length >= 3) {
    return { r: +nums[0], g: +nums[1], b: +nums[2] };
  }
  return fallback;
}

function clamp(x: number, lo: number, hi: number): number {
  return x < lo ? lo : x > hi ? hi : x;
}

/** One standard-normal sample (Box-Muller), for the clusters' Gaussian spread. */
function gaussian(): number {
  const u = Math.random() || 1e-9;
  const v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function rgba(c: RGB, a: number): string {
  return `rgba(${c.r | 0}, ${c.g | 0}, ${c.b | 0}, ${a})`;
}

/** Blend from a (t=0) to b (t=1). */
function mix(a: RGB, b: RGB, t: number): RGB {
  return {
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
  };
}

export function initParticlesDiagram(): void {
  // Landing-only. The shell pages never carry the figure, so a missing canvas
  // is expected and the module simply does nothing.
  const host = document.querySelector<HTMLElement>('.particles-diagram');
  const canvas = host?.querySelector<PdCanvas>('.pd-canvas');
  const ctx = canvas?.getContext('2d');
  if (!host || !canvas || !ctx) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const debug = new URLSearchParams(window.location.search).has('debug');

  let width = 0;
  let height = 0;
  let dpr = 1;
  let nodes: Node[] = [];
  let cursor: { x: number; y: number } | null = null;

  // The red bookkeeping. redQuota is the number of reds the field sustains; it
  // starts at the seeded red count, only ever shrinks, and only ever by a
  // pointer kill. nextCluster hands out fresh ids so a respawned cluster is
  // distinct from the one that died. churnAccum only advances while the loop
  // runs (on screen), so no turnover accrues off screen.
  let redQuota = 0;
  let nextCluster = 0;
  let churnAccum = 0;
  let churnInterval = CHURN_MIN + Math.random() * (CHURN_MAX - CHURN_MIN);

  // The two inks, read from the container's scoped tokens and re-read whenever
  // the theme flips (the pill sets data-theme; system mode follows the OS query
  // with no attribute change, so both are watched).
  let green = GREEN_FALLBACK;
  let red = RED_FALLBACK;
  const readColors = (): void => {
    const cs = getComputedStyle(host);
    green = parseColor(cs.getPropertyValue('--pd-ok'), GREEN_FALLBACK);
    red = parseColor(cs.getPropertyValue('--pd-alert'), RED_FALLBACK);
  };
  readColors();
  new MutationObserver(readColors).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });
  window
    .matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', readColors);

  /** Match the backing store to the CSS box at the capped device ratio. */
  const measure = (): boolean => {
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return false;
    width = rect.width;
    height = rect.height;
    dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return true;
  };

  const makeNode = (x: number, y: number, isRed: boolean, cluster: number): Node => {
    const angle = Math.random() * Math.PI * 2;
    const speed = SPEED_MIN + Math.random() * (SPEED_MAX - SPEED_MIN);
    return {
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      r: R_MIN + Math.random() * (R_MAX - R_MIN),
      phase: Math.random() * Math.PI * 2,
      redness: isRed ? 1 : 0,
      redTarget: isRed ? 1 : 0,
      easeRate: CONVERT_RATE,
      cluster,
      humanKilled: false,
      pushed: false,
    };
  };

  const seed = (): void => {
    const count = clamp(Math.round((width * height) / AREA_PER_NODE), COUNT_MIN, COUNT_MAX);
    const redCount = Math.round(count * RED_FRACTION);
    const clusterCount = CLUSTER_MIN + Math.floor(Math.random() * (CLUSTER_MAX - CLUSTER_MIN + 1));
    const centers: { x: number; y: number }[] = [];
    for (let i = 0; i < clusterCount; i++) {
      centers.push({ x: (0.15 + Math.random() * 0.7) * width, y: (0.15 + Math.random() * 0.7) * height });
    }
    const spread = Math.min(width, height) * CLUSTER_SPREAD;
    nodes = [];
    for (let i = 0; i < count; i++) {
      const isRed = i < redCount;
      if (isRed) {
        const c = centers[i % clusterCount];
        nodes.push(
          makeNode(
            clamp(c.x + gaussian() * spread, 0, width),
            clamp(c.y + gaussian() * spread, 0, height),
            true,
            i % clusterCount,
          ),
        );
      } else {
        nodes.push(makeNode(Math.random() * width, Math.random() * height, false, -1));
      }
    }
    redQuota = redCount;
    nextCluster = clusterCount;
    churnAccum = 0;
    churnInterval = CHURN_MIN + Math.random() * (CHURN_MAX - CHURN_MIN);
  };

  /** A pointer kill: every live red under the cursor greens for good, and each
   *  one shrinks the quota so no natural respawn ever brings it back. */
  const killUnderCursor = (instant: boolean): void => {
    if (!cursor) return;
    const grabSq = GRAB_DIST * GRAB_DIST;
    for (const p of nodes) {
      if (p.redTarget !== 1 || p.humanKilled) continue;
      const dx = p.x - cursor.x;
      const dy = p.y - cursor.y;
      if (dx * dx + dy * dy < grabSq) {
        p.redTarget = 0;
        p.easeRate = CONVERT_RATE;
        p.humanKilled = true;
        p.cluster = -1;
        if (instant) p.redness = 0;
        redQuota = Math.max(0, redQuota - 1);
      }
    }
  };

  /** One ambient turnover: the oldest living red cluster eases to green, and the
   *  same number of the nearest eligible greens form a new cluster elsewhere, so
   *  the red count is restored. Human-killed nodes are excluded from both ends,
   *  so a partly-killed cluster only respawns its naturally-died remainder. Stops
   *  once the quota reaches zero. */
  const churn = (): void => {
    if (redQuota <= 0) return;

    // Group the living reds by cluster, then take the oldest (lowest id); a
    // just-born cluster has the highest id and so is never the one that dies.
    const living = new Map<number, Node[]>();
    for (const p of nodes) {
      if (p.redTarget === 1 && p.cluster >= 0 && !p.humanKilled) {
        const bucket = living.get(p.cluster);
        if (bucket) bucket.push(p);
        else living.set(p.cluster, [p]);
      }
    }
    if (living.size === 0) return;
    let dyingId = Infinity;
    for (const id of living.keys()) dyingId = Math.min(dyingId, id);
    const dying = living.get(dyingId) ?? [];

    for (const p of dying) {
      p.redTarget = 0;
      p.easeRate = NATURAL_RATE;
    }

    // Recruit the same count of the nearest settled greens to a fresh centre.
    const cx = (0.15 + Math.random() * 0.7) * width;
    const cy = (0.15 + Math.random() * 0.7) * height;
    const eligible = nodes.filter(
      (p) => p.redTarget === 0 && p.redness < 0.15 && p.cluster === -1 && !p.humanKilled,
    );
    eligible.sort(
      (a, b) => (a.x - cx) ** 2 + (a.y - cy) ** 2 - ((b.x - cx) ** 2 + (b.y - cy) ** 2),
    );
    const bornId = nextCluster++;
    const born = Math.min(dying.length, eligible.length);
    for (let i = 0; i < born; i++) {
      const p = eligible[i];
      p.redTarget = 1;
      p.easeRate = NATURAL_RATE;
      p.cluster = bornId;
      p.pushed = false;
    }
  };

  /** Advance the field one step: motion, colour easing, pointer kills, churn. */
  const step = (dt: number): void => {
    killUnderCursor(false);
    for (const p of nodes) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      // Bounce at the edges: clamp back in and flip the crossing component.
      if (p.x < 0) {
        p.x = 0;
        p.vx = -p.vx;
      } else if (p.x > width) {
        p.x = width;
        p.vx = -p.vx;
      }
      if (p.y < 0) {
        p.y = 0;
        p.vy = -p.vy;
      } else if (p.y > height) {
        p.y = height;
        p.vy = -p.vy;
      }
      // Ease the colour toward the node's target; a natural death that lands on
      // green frees the node back to the recruitable green pool.
      if (p.redness !== p.redTarget) {
        const d = p.easeRate * dt;
        if (p.redTarget > p.redness) {
          p.redness = Math.min(1, p.redness + d);
        } else {
          p.redness = Math.max(0, p.redness - d);
          if (p.redness === 0 && !p.humanKilled) p.cluster = -1;
        }
      }
    }
    // Ambient churn accrues only here, so it never advances off screen; reset to
    // zero after one turnover caps any catch-up at a single cluster.
    churnAccum += dt;
    if (churnAccum >= churnInterval) {
      churnAccum = 0;
      churnInterval = CHURN_MIN + Math.random() * (CHURN_MAX - CHURN_MIN);
      churn();
    }
  };

  const draw = (t: number): void => {
    ctx.clearRect(0, 0, width, height);

    // Links between near nodes, under the nodes. A pair reads red only when both
    // ends are red; mixed and green-green fall to green through the min.
    ctx.lineWidth = 1;
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const d2 = dx * dx + dy * dy;
        if (d2 >= LINK_DIST * LINK_DIST) continue;
        const d = Math.sqrt(d2);
        const col = mix(green, red, Math.min(a.redness, b.redness));
        ctx.strokeStyle = rgba(col, LINK_ALPHA * (1 - d / LINK_DIST));
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }

    // The grab: green links from the cursor to every node in reach, drawn over
    // the field links and always green whatever the node's own colour.
    if (cursor) {
      for (const p of nodes) {
        const dx = p.x - cursor.x;
        const dy = p.y - cursor.y;
        const d2 = dx * dx + dy * dy;
        if (d2 >= GRAB_DIST * GRAB_DIST) continue;
        const d = Math.sqrt(d2);
        ctx.strokeStyle = rgba(green, GRAB_ALPHA * (1 - d / GRAB_DIST));
        ctx.beginPath();
        ctx.moveTo(cursor.x, cursor.y);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      }
    }

    // The nodes, each breathing a little in size and opacity off its own phase.
    for (const p of nodes) {
      const osc = 0.5 + 0.5 * Math.sin(t * BREATHE + p.phase);
      const radius = p.r * (0.78 + 0.22 * osc);
      const alpha = 0.55 + 0.3 * osc;
      ctx.fillStyle = rgba(mix(green, red, p.redness), alpha);
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const pointFromEvent = (e: PointerEvent | MouseEvent): { x: number; y: number } => {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const push = (at: { x: number; y: number }): void => {
    for (let i = 0; i < PUSH_COUNT; i++) {
      const p = makeNode(clamp(at.x, 0, width), clamp(at.y, 0, height), false, -1);
      p.pushed = true;
      nodes.push(p);
    }
    // Trim the oldest pushed nodes once the field runs past its headroom. A
    // pushed node recruited into a cluster has its pushed flag cleared, so the
    // trim never removes a red.
    const cap = COUNT_MAX + COUNT_HEADROOM;
    while (nodes.length > cap) {
      const i = nodes.findIndex((n) => n.pushed);
      if (i < 0) break;
      nodes.splice(i, 1);
    }
  };

  // The animation loop, wired only in the animated path below.
  let running = false;
  let rafId = 0;
  let last = 0;
  const frame = (now: number): void => {
    if (!running) return;
    const dt = Math.min((now - last) / 1000, DT_CAP);
    last = now;
    step(dt);
    draw(now / 1000);
    rafId = window.requestAnimationFrame(frame);
  };
  const start = (): void => {
    if (running) return;
    running = true;
    last = performance.now();
    rafId = window.requestAnimationFrame(frame);
  };

  let booted = false;
  const boot = (): void => {
    if (booted || !measure()) return;
    booted = true;
    seed();

    // Verification hooks, only under ?debug: a live snapshot of the bookkeeping
    // and a way to fire a turnover on demand. Absent from the shipped page.
    if (debug) {
      canvas.__pdSnapshot = () => ({
        quota: redQuota,
        redIdentity: nodes.filter((n) => n.redTarget === 1).length,
        establishedRed: nodes.filter((n) => n.redness > 0.5).length,
        humanKilled: nodes.filter((n) => n.humanKilled).length,
        clusters: new Set(
          nodes.filter((n) => n.redTarget === 1 && n.cluster >= 0).map((n) => n.cluster),
        ).size,
        total: nodes.length,
        churnAccum: +churnAccum.toFixed(2),
        churnInterval: +churnInterval.toFixed(2),
      });
      canvas.__pdForceChurn = () => churn();
    }

    // The cursor is read on the canvas alone and nothing is ever prevented, so
    // a wheel or a touch-drag over the field still scrolls the page under Lenis.
    canvas.addEventListener('pointermove', (e) => {
      cursor = pointFromEvent(e);
      if (reduced) {
        killUnderCursor(true);
        draw(0);
      }
    });
    const clearCursor = (): void => {
      cursor = null;
      if (reduced) draw(0);
    };
    canvas.addEventListener('pointerleave', clearCursor);
    canvas.addEventListener('pointercancel', clearCursor);
    canvas.addEventListener('pointerup', (e) => {
      if (e.pointerType !== 'mouse') clearCursor();
    });
    // Click, not pointerdown, so a touch-scroll that starts on the field does
    // not read as a push; a genuine tap or click still spawns nodes.
    canvas.addEventListener('click', (e) => {
      push(pointFromEvent(e));
      if (reduced) draw(0);
    });

    let resizeRaf = 0;
    window.addEventListener('resize', () => {
      if (resizeRaf) return;
      resizeRaf = window.requestAnimationFrame(() => {
        resizeRaf = 0;
        const prevW = width;
        const prevH = height;
        if (!measure()) return;
        // Carry the field across the new box proportionally rather than
        // reseeding, so conversions, quota, and pushes survive a rotation.
        if (prevW > 0 && prevH > 0 && (width !== prevW || height !== prevH)) {
          const kx = width / prevW;
          const ky = height / prevH;
          for (const p of nodes) {
            p.x = clamp(p.x * kx, 0, width);
            p.y = clamp(p.y * ky, 0, height);
          }
        }
        if (reduced) draw(0);
      });
    });

    // Reduced motion holds one settled frame and never churns; the pointer
    // handlers above still redraw it for the grab and its kills, without motion.
    if (reduced) {
      draw(0);
      return;
    }

    // Draw one frame up front so the box is never blank before the observer
    // fires, then run the loop only while the field is on screen.
    draw(0);
    new IntersectionObserver(
      (entries) => {
        const on = entries[0]?.isIntersecting ?? false;
        if (on && !running) {
          start();
        } else if (!on && running) {
          running = false;
          window.cancelAnimationFrame(rafId);
        }
      },
      { threshold: IN_VIEW },
    ).observe(host);
  };

  // Boot now if the box is already laid out; otherwise poll a bounded window of
  // frames and also retry on resize, so a late layout still starts the field.
  boot();
  if (!booted) {
    let tries = 0;
    const poll = (): void => {
      if (booted) return;
      boot();
      if (!booted && tries++ < 120) window.requestAnimationFrame(poll);
    };
    window.requestAnimationFrame(poll);
    window.addEventListener('resize', boot);
  }
}

/**
 * The small-software footnote in the #compiler lede. The lede is one data-i18n
 * string, and the i18n pass sets it through textContent, which flattens any
 * child markup on boot and on every locale swap. So the anchor cannot live in
 * the static HTML; instead the two words "small software" are wrapped here
 * after each paint, with a superscript 1 marking the reference. The phrase is
 * kept in English in both catalogs, so one literal match serves every locale.
 *
 * The accessible name reuses the existing smallSoftware key: the data-i18n-attr
 * carries the convention, and because this runs after the i18n attribute pass
 * the label is also set live from the active catalog, so it is right on first
 * paint and after a locale change alike.
 */
export function initSmallSoftwareNote(): void {
  const lede = document.querySelector<HTMLElement>('#compiler .section-lede');
  if (!lede) return;

  const HREF = 'https://www.ycombinator.com/rfs#a-cloud-for-small-software';
  const PHRASE = 'small software';

  const wrap = (): void => {
    if (lede.querySelector('.ss-note')) return;
    for (const node of Array.from(lede.childNodes)) {
      if (node.nodeType !== window.Node.TEXT_NODE) continue;
      const text = node.textContent ?? '';
      const idx = text.indexOf(PHRASE);
      if (idx < 0) continue;

      const frag = document.createDocumentFragment();
      const before = text.slice(0, idx);
      const after = text.slice(idx + PHRASE.length);
      if (before) frag.appendChild(document.createTextNode(before));

      const a = document.createElement('a');
      a.className = 'ss-note';
      a.href = HREF;
      a.target = '_blank';
      a.rel = 'noopener';
      a.setAttribute('data-i18n-attr', 'aria-label:smallSoftware');
      a.setAttribute('aria-label', msg().smallSoftware);
      a.append(PHRASE);
      const mark = document.createElement('sup');
      mark.className = 'ss-note-mark';
      mark.textContent = '1';
      a.appendChild(mark);
      frag.appendChild(a);

      if (after) frag.appendChild(document.createTextNode(after));
      node.parentNode?.replaceChild(frag, node);
      break;
    }
  };

  wrap();
  // Each locale swap re-flattens the lede through textContent; re-wrap after.
  window.addEventListener('locale-change', wrap);
}
