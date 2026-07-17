/**
 * The compiler diagram in the #compiler section, a live simulation of AI
 * traffic drawing on the firm knowledge library. This module owns the whole
 * scene. It renders the SVG into the .compiler-diagram wrapper, spawns
 * traffic lines that enter on the left about 60% green and 40% red, forks
 * some of them into DAG splitoffs with 45 degree elbows, and rides packet
 * dots along every stroke in the stroke's current color. A struggling red
 * line drops an ink connector straight down into the library, the library
 * answers the reddest waiting line with an ink connector straight back up,
 * and the line runs green from that point rightward. A quarter of the red
 * lines never draw on the library at all, so while fresh red keeps entering
 * on the left the right edge settles to about 90% green with an honest red
 * holdout or two.
 *
 * Gating mirrors cellgame.ts. Under reduced motion the module renders one
 * settled frame and stops. Otherwise an IntersectionObserver starts and
 * stops the frame loop, so the field only moves while it is on screen.
 */

/** The diagram must be at least this visible before its motion runs. */
const IN_VIEW = 0.2;

const NS = 'http://www.w3.org/2000/svg';

/* Field geometry, in viewBox units. Ten traffic lanes cross the top and the
 * library slab spans the width below them. */
const VIEW_W = 1200;
/* Cropped to just below the box (its bottom sits at 292) so the box reads as the
 * figure's last element. The old 300 left empty space under it, which pushed the
 * explore link's gap wider than every other section's. */
const VIEW_H = 293;
/* Draw bounds sit flush with the viewBox edges, so the strokes fill the whole
 * SVG element. The wrapper's width is the header and footer content span (the
 * chrome padding in from each viewport edge), so the traffic ends exactly
 * under the wordmark on the left and the Book a call button on the right.
 * The right bound is scene.viewW: the fixed VIEW_W on desktop, and on a
 * phone the drawable width layoutBox derives from the container. */
const LEFT = 0;
/* Below this viewport width the aspect lock decouples: the viewBox width
 * tracks the container at one unit per CSS pixel while the height stays
 * VIEW_H, so lane pitch, stroke weight, and the label render at their
 * desktop pixel size and only the horizontal extent compresses. At and
 * above it the field is the fixed VIEW_W and renders exactly as before. */
const DESKTOP_MIN_VW = 900;
/* The narrowest drawable width; a container thinner than this falls back
 * to uniform scaling, far below any phone viewport. */
const FIELD_MIN = 240;
/* The empty band above the first lane (LANE_TOP) is tuned to equal the gap
 * from the last lane down to the box, so the figure's whitespace above and
 * below reads the same. With the box top at 232 and ten lanes 18 apart, 35
 * lands both gaps at 35 units. */
const LANE_TOP = 35;
const LANE_PITCH = 18;
const LANE_COUNT = 10;
const BOX_TOP = 232;
const BOX_HEIGHT = 60;
/* The traffic fills the whole field, but the library box is pinned to the
 * site's normal section width, not the wider break-out. The section width and
 * the field width scale differently with the viewport, so the box inset cannot
 * be a fixed viewBox number; layoutBox measures both and sets the rect on every
 * resize. These two are only the first-paint fallback. */
const BOX_LEFT = 52;
const BOX_RIGHT = 1148;

/* Pacing, in viewBox units per second and in seconds. Calm on purpose. */
const DRAW_SPEED: readonly [number, number] = [80, 120];
const PACKET_SPEED: readonly [number, number] = [110, 170];
/* How long a line rests drawn across before it retires. This has to dominate the
 * draw-in (a line takes roughly ten to fifteen seconds to cross), or a line
 * spends most of its life still drawing and the field reads sparse no matter
 * how the retirements are spaced. Long and wide: most lanes sit drawn, every
 * line still leaves, and the spread keeps them from leaving together. */
const HOLD_S: readonly [number, number] = [18, 34];
const RESPAWN_S: readonly [number, number] = [0.8, 2.4];
const FADE_S = 1.2;
const LINK_DRAW_S = 0.55;
const LINK_FADE_S = 0.7;
const DOWN_HOLD_S = 1.3;
const UP_HOLD_S = 1.7;
const LINK_GAP_S = 0.9;
const MAX_LINKS = 5;
const MAX_BRANCHES = 5;
/* Lanes held open so splitoffs always have somewhere to fork; without this the
 * lines refill every freed lane and no branch can ever spawn. Too high starves
 * the field of the young green lines splitoffs fork from, so keep it modest. */
const BRANCH_RESERVE = 2;
/* The shortest gap between two retirements, so a cohort whose holds expire
 * together still leaves one at a time. This is the only thing gating a
 * retirement: nothing waits on a count, so the field can never lock up the way
 * a floor on the drawn lanes did. The long HOLD_S above is what keeps the field
 * full; the spacing here is only what keeps departures from bunching. */
const RETIRE_GAP_S = 1.4;
const DT_CAP = 0.064;
/** How many capped substeps one frame may run to catch the wall clock: full
 * speed down to about two frames a second, which covers a machine that is
 * genuinely struggling, not just busy. */
const CATCHUP_STEPS = 8;

type Tone = 'green' | 'red';

/** What a line is destined for. Green lines never need the library's help;
 * a "fix" red draws on it and turns green; a holdout never does. */
type Fate = 'green' | 'fix' | 'holdout';

interface Packet {
  el: SVGCircleElement;
  x: number;
  speed: number;
  tone: Tone;
}

interface Branch {
  el: SVGPathElement;
  packet: Packet | null;
  lane: number;
  forkX: number;
  /** Where the spur elbows back into its parent lane; Infinity runs to the edge. */
  rejoinX: number;
  y0: number;
  y1: number;
  headX: number;
  maxX: number;
}

interface Line {
  group: SVGGElement;
  redEl: SVGPathElement;
  greenEl: SVGPathElement;
  packets: Packet[];
  branch: Branch | null;
  lane: number;
  y: number;
  tone: Tone;
  fate: Fate;
  fixX: number;
  askX: number;
  asked: boolean;
  askedAt: number;
  fixSent: boolean;
  fixed: boolean;
  branchAtX: number;
  headX: number;
  speed: number;
  holdLeft: number;
  fading: boolean;
  alpha: number;
  gone: boolean;
}

interface Link {
  el: SVGPathElement;
  up: boolean;
  line: Line;
  age: number;
  holdS: number;
  len: number;
  applied: boolean;
}

interface Scene {
  host: HTMLElement;
  box: SVGRectElement;
  label: SVGTextElement;
  /** The drawable width in viewBox units. VIEW_W on desktop; on a phone
   * layoutBox retunes it to the container so the field compresses only
   * horizontally. Every horizontal plan reads it through sx. */
  viewW: number;
  /** The box's horizontal span in viewBox units; layoutBox keeps it current so
   * connectors only ever drop within the box, never out at the field edges. */
  boxL: number;
  boxR: number;
  linesG: SVGGElement;
  linksG: SVGGElement;
  lines: Line[];
  links: Link[];
  laneUsed: ('line' | 'branch' | null)[];
  laneFreeAt: number[];
  t: number;
  lastLinkAt: number;
  /** When the last line began fading, so retirements stay spaced apart. */
  lastRetireAt: number;
  /** A beat is a pair: one connector drops in, then one rises right after. The
   * down picks the line the up will answer, so every down is paired. */
  pendingUp: Line | null;
  pendingUpAt: number;
  drawTone: () => Tone;
  drawFate: () => Fate;
}

const rand = (range: readonly [number, number]): number =>
  range[0] + Math.random() * (range[1] - range[0]);

const r1 = (n: number): number => Math.round(n * 10) / 10;

const easeOut = (u: number): number => 1 - (1 - u) * (1 - u);

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const a = arr[i];
    arr[i] = arr[j];
    arr[j] = a;
  }
  return arr;
}

/** A shuffled bag keeps a random draw honest over time, so the entering
 * traffic really holds its 60/40 split and three of every four reds get
 * fixed, instead of drifting on small samples. */
function bag<T>(items: readonly T[]): () => T {
  let pool: T[] = [];
  return (): T => {
    if (pool.length === 0) pool = shuffle([...items]);
    const v = pool.pop();
    return v ?? items[0];
  };
}

function make<K extends keyof SVGElementTagNameMap>(
  tag: K,
  cls: string,
  attrs: Record<string, string> = {},
): SVGElementTagNameMap[K] {
  const node = document.createElementNS(NS, tag);
  if (cls) node.setAttribute('class', cls);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

const laneY = (lane: number): number => LANE_TOP + lane * LANE_PITCH;

/** Positions planned along the field (fork windows, spawn offsets) are tuned
 * in the VIEW_W-unit desktop field; sx maps one into the current drawable
 * width so the same plan compresses with the field. On desktop scene.viewW
 * is VIEW_W and every value passes through unchanged. */
const sx = (scene: Scene, x: number): number => (x * scene.viewW) / VIEW_W;

const hseg = (a: number, b: number, y: number): string =>
  b > a ? `M${r1(a)} ${y}H${r1(b)}` : '';

export function initCompilerDiagram(): void {
  // Landing-only. The shell pages never carry the scene, so a missing
  // wrapper is expected and the module simply does nothing.
  const host = document.querySelector<HTMLElement>('.compiler-diagram');
  if (!host) return;

  const scene = buildScene(host);
  layoutBox(scene);
  window.addEventListener('resize', () => layoutBox(scene));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  seed(scene, reduced);
  renderAll(scene);

  // Reduced motion holds the one settled frame just rendered. The field
  // reads mostly green on the right, with the connectors drawn and still.
  if (reduced) return;

  let running = false;
  let rafId = 0;
  let last = 0;

  const frame = (now: number): void => {
    if (!running) return;
    // The sim advances on wall time, not frame count. A slow frame runs
    // several fixed substeps to catch up, each small enough for the motion
    // logic, so a struggling machine sees the same field as a fast one: it
    // was the film's renderer dragging the page's frame rate down that made
    // every hold read as forever, the clock crawling with the frames. The
    // budget bounds the catch-up so a stall can't buy a burst of work; past
    // it, time is simply dropped, which only an occluded tab ever hits.
    let owed = Math.min((now - last) / 1000, DT_CAP * CATCHUP_STEPS);
    last = now;
    while (owed > 0) {
      const d = Math.min(owed, DT_CAP);
      step(scene, d);
      owed -= d;
    }
    rafId = window.requestAnimationFrame(frame);
  };

  // On screen the simulation steps; off screen the loop stops cold and the
  // clock freezes with it, so nothing runs or accumulates unseen.
  new IntersectionObserver(
    (entries) => {
      const on = entries[0]?.isIntersecting ?? false;
      host.classList.toggle('is-animating', on);
      if (on && !running) {
        running = true;
        last = performance.now();
        rafId = window.requestAnimationFrame(frame);
      } else if (!on && running) {
        running = false;
        window.cancelAnimationFrame(rafId);
      }
    },
    { threshold: IN_VIEW },
  ).observe(host);
}

function buildScene(host: HTMLElement): Scene {
  host.textContent = '';
  const svg = make('svg', 'cd-svg', {
    viewBox: `0 0 ${VIEW_W} ${VIEW_H}`,
    preserveAspectRatio: 'xMidYMid meet',
  });
  // Connectors sit under the traffic so junctions stay crisp; the library
  // slab paints over both connector feet, and the label rides the slab.
  const linksG = make('g', 'cd-links');
  const linesG = make('g', 'cd-lines');
  const box = make('rect', 'cd-box', {
    x: String(BOX_LEFT),
    y: String(BOX_TOP),
    width: String(BOX_RIGHT - BOX_LEFT),
    height: String(BOX_HEIGHT),
    rx: '3',
  });
  const label = make('text', 'cd-label', {
    x: String(VIEW_W / 2),
    y: String(BOX_TOP + BOX_HEIGHT / 2),
    'text-anchor': 'middle',
    'dominant-baseline': 'central',
  });
  label.textContent = 'Firm knowledge library';
  svg.append(linksG, linesG, box, label);
  host.append(svg);

  return {
    host,
    box,
    label,
    viewW: VIEW_W,
    boxL: BOX_LEFT,
    boxR: BOX_RIGHT,
    linesG,
    linksG,
    lines: [],
    links: [],
    laneUsed: new Array<'line' | 'branch' | null>(LANE_COUNT).fill(null),
    laneFreeAt: new Array<number>(LANE_COUNT).fill(0),
    t: 0,
    lastLinkAt: -LINK_GAP_S,
    lastRetireAt: -RETIRE_GAP_S,
    pendingUp: null,
    pendingUpAt: 0,
    drawTone: bag<Tone>([
      'green', 'green', 'green', 'green', 'green', 'green',
      'red', 'red', 'red', 'red',
    ]),
    drawFate: bag<Fate>(['fix', 'fix', 'fix', 'holdout']),
  };
}

/** Sizes the drawable field and pins the library box to the site's normal
 * section width. On desktop the field is the fixed VIEW_W. On a phone the
 * aspect-locked viewBox would scale the whole figure down uniformly, so the
 * viewBox width tracks the container at one unit per CSS pixel instead: the
 * vertical layout and stroke weights render at their desktop size and only
 * the horizontal extent compresses. The box then insets from the current
 * field the way every other section insets from the break-out span, and the
 * label re-centres on the field. */
function layoutBox(scene: Scene): void {
  const svg = scene.host.querySelector('svg');
  const container = scene.host.parentElement;
  if (!svg || !container) return;
  const fieldW = svg.getBoundingClientRect().width;
  if (fieldW <= 0) return;
  const w =
    window.innerWidth < DESKTOP_MIN_VW
      ? Math.max(FIELD_MIN, Math.round(fieldW))
      : VIEW_W;
  if (w !== scene.viewW) {
    const prevW = scene.viewW;
    scene.viewW = w;
    svg.setAttribute('viewBox', `0 0 ${w} ${VIEW_H}`);
    scene.label.setAttribute('x', String(w / 2));
    rescaleField(scene, prevW);
  }
  const cs = getComputedStyle(container);
  const contentW =
    container.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  // The half difference, from screen pixels into viewBox units.
  const inset = Math.max(0, ((fieldW - contentW) / 2) * (scene.viewW / fieldW));
  const left = r1(inset);
  const right = r1(scene.viewW - inset);
  scene.boxL = left;
  scene.boxR = right;
  scene.box.setAttribute('x', String(left));
  scene.box.setAttribute('width', String(r1(right - left)));
}

/** After the drawable width changes mid-run (a rotation across the desktop
 * boundary), carry the whole composition over proportionally: heads, fix
 * points, fork plans, packets, and connector feet keep their relative
 * positions, so full-span lines stay full-span and a fixed line's green
 * still starts where its connector landed. One render then syncs the DOM,
 * which matters when the loop is paused or reduced motion holds one frame. */
function rescaleField(scene: Scene, prevW: number): void {
  const k = scene.viewW / prevW;
  for (const line of scene.lines) {
    line.headX *= k;
    if (Number.isFinite(line.fixX)) line.fixX *= k;
    if (Number.isFinite(line.askX)) line.askX *= k;
    if (Number.isFinite(line.branchAtX)) line.branchAtX *= k;
    const b = line.branch;
    if (b) {
      b.forkX *= k;
      if (Number.isFinite(b.rejoinX)) b.rejoinX *= k;
      b.maxX = b.rejoinX === Infinity ? scene.viewW : b.rejoinX + LANE_PITCH;
      b.headX = Math.min(b.headX * k, b.maxX);
      if (b.packet) b.packet.x *= k;
    }
    for (const p of line.packets) p.x *= k;
  }
  for (const link of scene.links) {
    const m = /^M([\d.-]+) /.exec(link.el.getAttribute('d') ?? '');
    if (!m) continue;
    const x = r1(parseFloat(m[1]) * k);
    link.el.setAttribute(
      'd',
      link.up ? `M${x} ${BOX_TOP}V${link.line.y}` : `M${x} ${link.line.y}V${BOX_TOP}`,
    );
  }
  renderAll(scene);
}

function addPacket(line: Line, x: number): Packet {
  const tone = toneAt(line, x);
  const el = make('circle', `cd-packet cd-packet-${tone}`, { r: '3' });
  line.group.append(el);
  const p: Packet = { el, x, speed: rand(PACKET_SPEED), tone };
  line.packets.push(p);
  return p;
}

function addLine(scene: Scene, lane: number, tone: Tone, fate: Fate, headX: number): Line {
  const group = make('g', 'cd-flow');
  const redEl = make('path', 'cd-line cd-line-red');
  const greenEl = make('path', 'cd-line cd-line-green');
  group.append(redEl, greenEl);
  scene.linesG.append(group);

  // A fix lands within the box span, so the red turns green above the library
  // rather than out at an edge.
  const fixX =
    fate === 'fix'
      ? scene.boxL + 60 + Math.random() * Math.max(1, scene.boxR - scene.boxL - 120)
      : Infinity;
  const line: Line = {
    group,
    redEl,
    greenEl,
    packets: [],
    branch: null,
    lane,
    y: laneY(lane),
    tone,
    fate,
    fixX,
    askX: fate === 'fix' ? Math.max(60, fixX - 30 - Math.random() * 90) : Infinity,
    asked: false,
    askedAt: 0,
    fixSent: false,
    fixed: false,
    branchAtX: Math.random() < 0.9 ? sx(scene, 220 + Math.random() * 600) : Infinity,
    headX,
    speed: rand(DRAW_SPEED),
    holdLeft: rand(HOLD_S),
    fading: false,
    alpha: 1,
    gone: false,
  };
  scene.lines.push(line);
  scene.laneUsed[lane] = 'line';
  addPacket(line, headX > LEFT ? LEFT + Math.random() * (headX - LEFT) : LEFT);
  addPacket(line, LEFT - sx(scene, 150 + Math.random() * 300));
  return line;
}

function addBranch(scene: Scene, line: Line, lane: number, forkX: number, rejoinX: number): void {
  const el = make('path', 'cd-line cd-line-green');
  line.group.append(el);
  const branch: Branch = {
    el,
    packet: null,
    lane,
    forkX,
    rejoinX,
    y0: line.y,
    y1: laneY(lane),
    headX: forkX,
    maxX: rejoinX === Infinity ? scene.viewW : rejoinX + LANE_PITCH,
  };
  line.branch = branch;
  scene.laneUsed[lane] = 'branch';
  // Only a splitoff that runs to the edge carries its own packet; a short
  // rejoining spur is over too soon to need one.
  if (rejoinX === Infinity) {
    const tone: Tone = 'green';
    const pel = make('circle', `cd-packet cd-packet-${tone}`, { r: '3' });
    line.group.append(pel);
    branch.packet = { el: pel, x: forkX, speed: rand(PACKET_SPEED), tone };
  }
}

/** The stroke color under a given x, which is also the color of any packet
 * riding there. A fixed line is red before its fix point and green after. */
function toneAt(line: Line, x: number): Tone {
  if (line.tone === 'green') return 'green';
  return line.fixed && x >= line.fixX ? 'green' : 'red';
}

function spawnLink(scene: Scene, line: Line, x: number, up: boolean): Link {
  const len = BOX_TOP - line.y;
  const el = make('path', 'cd-link', {
    d: up ? `M${r1(x)} ${BOX_TOP}V${line.y}` : `M${r1(x)} ${line.y}V${BOX_TOP}`,
    'stroke-dasharray': String(len),
    'stroke-dashoffset': String(len),
    opacity: '0',
  });
  scene.linksG.append(el);
  const link: Link = {
    el,
    up,
    line,
    age: 0,
    holdS: up ? UP_HOLD_S : DOWN_HOLD_S,
    len,
    applied: false,
  };
  scene.links.push(link);
  scene.lastLinkAt = scene.t;
  return link;
}

/* ------------------------------------------------------------------ boot */

/** Builds the opening field. Eight lines enter on the left, five green and
 * three red, and two green parents carry the DAG splitoffs, one spur that
 * rejoins its lane and one fork that runs to the edge. Two of the reds are
 * fated for a fix and one holds out, so the ten streams leaving the right
 * edge read nine green to one red. Settled mode freezes exactly that frame
 * for reduced motion; otherwise a few lines boot mid draw so the field is
 * already alive and keeps evolving from here. */
function seed(scene: Scene, settled: boolean): void {
  const parentLanes = [2, 7];
  const otherLanes = [0, 1, 4, 5, 6, 9];
  const tones = shuffle<Tone>(['green', 'green', 'green', 'red', 'red', 'red']);
  const fates = shuffle<Fate>(['fix', 'fix', 'holdout']);
  const phases = settled
    ? [1, 1, 1, 1, 1, 1]
    : shuffle([1, 1, 1, 0.8, 0.55, 0.3]);

  const roots: Line[] = [];
  otherLanes.forEach((lane, i) => {
    const tone = tones[i] ?? 'green';
    const fate: Fate = tone === 'red' ? (fates.pop() ?? 'fix') : 'green';
    const headX = LEFT + (phases[i] ?? 1) * (scene.viewW - LEFT);
    const line = addLine(scene, lane, tone, fate, headX);
    // A red already drawn past its fix point booted with the fix applied;
    // one still short of it will ask and be answered live.
    if (fate === 'fix' && headX >= line.fixX + 70) {
      line.asked = true;
      line.fixSent = true;
      line.fixed = true;
    }
    roots.push(line);
  });

  parentLanes.forEach((lane, i) => {
    const parent = addLine(scene, lane, 'green', 'green', scene.viewW);
    parent.branchAtX = Infinity;
    if (i === 0) {
      const forkX = sx(scene, 320 + Math.random() * 120);
      addBranch(scene, parent, lane + 1, forkX, forkX + sx(scene, 160 + Math.random() * 120));
    } else {
      addBranch(scene, parent, lane + 1, sx(scene, 480 + Math.random() * 180), Infinity);
    }
    const branch = parent.branch;
    if (branch) {
      branch.headX = branch.maxX;
      if (branch.packet) {
        branch.packet.x = branch.forkX + Math.random() * (branch.maxX - branch.forkX);
      }
    }
    roots.push(parent);
  });

  // Stagger the full lines' remaining hold so they retire one at a time.
  scene.lines.forEach((line, i) => {
    // Spread the opening cohort's departures wider than a line takes to draw in
    // (~12s), or the seeded lines leave faster than their replacements arrive
    // and the field thins out before it ever reaches its steady state.
    line.holdLeft = 6 + i * 9 + Math.random() * 5;
  });

  // The settled frame freezes one paired beat: a line dropping into the library
  // and the library answering a red just above the box, both within its span.
  if (settled) {
    const boxL = scene.boxL + 60;
    const boxR = scene.boxR - 60;
    const span = (): number => boxL + Math.random() * Math.max(1, boxR - boxL);
    const down = roots.find((l) => l.tone === 'green') ?? roots[0];
    const up = roots.find((l) => l.fate === 'fix');
    if (down) holdLink(spawnLink(scene, down, span(), false));
    if (up) {
      up.fixX = Math.max(boxL, Math.min(span(), up.headX - 20));
      up.fixed = true;
      holdLink(spawnLink(scene, up, up.fixX, true));
    }
  }
}

/** Pins a link at its fully drawn hold state for the still frame. */
function holdLink(link: Link): void {
  link.age = LINK_DRAW_S + 0.01;
  link.applied = true;
  renderLink(link);
}

/* ------------------------------------------------------------- the loop */

function step(scene: Scene, dt: number): void {
  scene.t += dt;

  // Respawn freed lanes so new traffic keeps entering on the left, but stop a
  // few lanes short of full: the held-open lanes are where splitoffs fork.
  let freeLanes = scene.laneUsed.reduce((n, u) => n + (u === null ? 1 : 0), 0);
  for (let lane = 0; lane < LANE_COUNT; lane += 1) {
    if (
      scene.laneUsed[lane] === null &&
      scene.t >= scene.laneFreeAt[lane] &&
      freeLanes > BRANCH_RESERVE
    ) {
      const tone = scene.drawTone();
      const fate: Fate = tone === 'red' ? scene.drawFate() : 'green';
      addLine(scene, lane, tone, fate, LEFT);
      freeLanes -= 1;
    }
  }

  for (let i = scene.lines.length - 1; i >= 0; i -= 1) {
    const line = scene.lines[i];
    advanceLine(scene, line, dt);
    if (line.gone) {
      scene.lines.splice(i, 1);
      continue;
    }
    renderLine(line);
  }

  maintainBranches(scene);
  control(scene);

  for (let i = scene.links.length - 1; i >= 0; i -= 1) {
    const link = scene.links[i];
    link.age += dt;
    // The fix lands the moment the rising connector reaches the line.
    if (link.up && !link.applied && link.age >= LINK_DRAW_S) {
      link.applied = true;
      link.line.fixed = true;
    }
    if (link.age >= LINK_DRAW_S + link.holdS + LINK_FADE_S || link.line.gone) {
      link.el.remove();
      scene.links.splice(i, 1);
    } else {
      renderLink(link);
    }
  }
}

function advanceLine(scene: Scene, line: Line, dt: number): void {
  if (line.headX < scene.viewW) {
    line.headX = Math.min(line.headX + line.speed * dt, scene.viewW);
  } else if (!line.fading) {
    // A parent carrying a splitoff waits for it to reach the edge before
    // retiring, so the branch is never cut off mid-run and the field keeps its
    // two or three live splitoffs instead of losing them early.
    if (line.branch && line.branch.headX < line.branch.maxX) {
      line.holdLeft = Math.max(line.holdLeft, 0.4);
    } else {
      line.holdLeft -= dt;
      if (line.holdLeft <= 0) {
        // Every line leaves eventually, but never alongside the others: it waits
        // until few enough lanes are mid-cycle and until a gap has passed since
        // the last departure, so by the time it goes the lines replacing it have
        // drawn in and the field still carries traffic. Both conditions clear on
        // their own, a drawing line always reaching the edge and time always
        // passing, so the field cannot lock up the way a floor on the drawn
        // count did.
        if (scene.t - scene.lastRetireAt >= RETIRE_GAP_S) {
          line.fading = true;
          scene.lastRetireAt = scene.t;
        } else {
          line.holdLeft = 0.25 + Math.random() * 0.5;
        }
      }
    }
  }

  if (line.fading) {
    line.alpha -= dt / FADE_S;
    if (line.alpha <= 0) {
      retire(scene, line);
      return;
    }
  }

  maybeBranch(scene, line);

  const branch = line.branch;
  if (branch && branch.headX < branch.maxX) {
    branch.headX = Math.min(branch.headX + line.speed * dt, branch.maxX);
  }

  for (const p of line.packets) {
    p.x += p.speed * dt;
    // A packet never outruns the drawing head; it rides the tip instead.
    if (p.x > line.headX - 6 && line.headX < scene.viewW) p.x = line.headX - 6;
    if (p.x > scene.viewW) p.x = LEFT - sx(scene, 60 + Math.random() * 320);
  }
  if (branch?.packet) {
    const q = branch.packet;
    q.x += q.speed * dt;
    if (q.x > branch.headX - 6 && branch.headX < branch.maxX) q.x = branch.headX - 6;
    // Recycled branch packets re-enter at the fork, like traffic taking it.
    if (q.x > branch.maxX) q.x = branch.forkX;
  }
}

function retire(scene: Scene, line: Line): void {
  line.gone = true;
  line.group.remove();
  scene.laneUsed[line.lane] = null;
  scene.laneFreeAt[line.lane] = scene.t + rand(RESPAWN_S);
  if (line.branch) {
    scene.laneUsed[line.branch.lane] = null;
    scene.laneFreeAt[line.branch.lane] = scene.t + rand(RESPAWN_S);
  }
}

/** Forks a splitoff when a line crosses its planned fork point, but only from a
 * stroke that is green there, into a free adjacent lane, and only while fewer
 * than the cap are alive. If no lane is free at the fork it retries a little
 * further along rather than forfeiting, so two or three splitoffs stay live. */
function maybeBranch(scene: Scene, line: Line): void {
  const forkX = line.branchAtX;
  if (line.branch !== null || line.fading || line.headX < forkX) return;
  if (!Number.isFinite(forkX)) return;
  const alive = scene.lines.reduce((n, l) => n + (l.branch ? 1 : 0), 0);
  if (alive >= MAX_BRANCHES || toneAt(line, forkX) !== 'green') {
    line.branchAtX = Infinity;
    return;
  }
  const open = [line.lane - 1, line.lane + 1].filter(
    (n) => n >= 0 && n < LANE_COUNT && scene.laneUsed[n] === null,
  );
  if (open.length === 0) {
    // No adjacent lane free at the fork; try again a little further along
    // instead of forfeiting, so splitoffs keep appearing as lanes open up.
    line.branchAtX = line.headX + 30 + Math.random() * 70;
    return;
  }
  line.branchAtX = Infinity;
  const lane = open[Math.floor(Math.random() * open.length)];
  // Bias toward running to the edge rather than rejoining, so a splitoff stays
  // on screen and two or three are usually visible at once instead of blinking
  // in and out.
  const rejoinX =
    Math.random() < 0.3
      ? Math.min(forkX + sx(scene, 120 + Math.random() * 260), scene.viewW - sx(scene, 120))
      : Infinity;
  addBranch(scene, line, lane, forkX, rejoinX);
}

/** Tops the field up to a floor of live splitoffs. maybeBranch alone lets the
 * count sag as parents retire faster than fresh lines reach their fork points,
 * so when fewer than two are running this forks one straight off a green line
 * near its head, into a free adjacent lane, out to the edge where it persists. */
function maintainBranches(scene: Scene): void {
  const alive = scene.lines.reduce((n, l) => n + (l.branch ? 1 : 0), 0);
  if (alive >= 2) return;
  // Fork off a young green line, its head still short of the box, so the
  // splitoff runs a long way before its parent retires and it lingers on
  // screen. Older lines would make short-lived spurs and the count would sag.
  for (const line of scene.lines) {
    if (line.branch || line.fading || line.gone) continue;
    if (line.headX < sx(scene, 180) || line.headX > sx(scene, 620)) continue;
    if (toneAt(line, line.headX - 40) !== 'green') continue;
    const open = [line.lane - 1, line.lane + 1].filter(
      (n) => n >= 0 && n < LANE_COUNT && scene.laneUsed[n] === null,
    );
    if (open.length === 0) continue;
    const lane = open[Math.floor(Math.random() * open.length)];
    const forkX = Math.max(scene.boxL, line.headX - 40);
    line.branchAtX = Infinity;
    addBranch(scene, line, lane, forkX, Infinity);
    break;
  }
}

/** The interaction director, in paired beats on a minimum gap. One line drops a
 * connector into the library, then the library answers right after with one
 * connector back up, either fixing a red line (green from the connector out) or
 * reinforcing a green one. Both feet land within the box span, above the
 * knowledge layer, never out at the field edges. */
function control(scene: Scene): void {
  const pad = 60;
  const boxL = scene.boxL + pad;
  const boxR = scene.boxR - pad;
  const span = (): number => boxL + Math.random() * Math.max(1, boxR - boxL);
  // Only lines drawn clear across the box can carry a connector foot.
  const past = (): Line[] =>
    scene.lines.filter((l) => !l.fading && !l.gone && l.headX >= scene.boxR);

  // The answer half of the beat: the target was chosen when the down was drawn,
  // so every down is answered. A fixable red turns green from the connector out;
  // anything else takes a reinforcing connector.
  if (scene.pendingUp) {
    if (scene.t < scene.pendingUpAt) return;
    let target = scene.pendingUp;
    scene.pendingUp = null;
    // If the chosen line retired in the beat's short window, answer another so
    // the down is still paired with an up.
    if (target.fading || target.gone) {
      const here = past();
      if (here.length === 0) return;
      target = here[Math.floor(Math.random() * here.length)];
    }
    if (target.tone === 'red' && !target.fixed) {
      target.fixX = Math.max(boxL, Math.min(span(), target.headX - 20));
      target.fixSent = true;
      spawnLink(scene, target, target.fixX, true);
    } else {
      spawnLink(scene, target, span(), true);
    }
    return;
  }

  // The down half of the next beat, once the gap has passed and there is room.
  if (scene.t - scene.lastLinkAt < LINK_GAP_S) return;
  if (scene.links.length >= MAX_LINKS - 1) return;
  const here = past();
  if (here.length === 0) return;
  const down = here[Math.floor(Math.random() * here.length)];
  spawnLink(scene, down, span(), false);
  // Choose now who the library answers: a fixable red if one waits, else a
  // green to reinforce, falling back to the line that just dropped in.
  const reds = here.filter(
    (l) => l.tone === 'red' && l.fate === 'fix' && !l.fixed && !l.fixSent,
  );
  const greens = here.filter((l) => l.tone === 'green' || l.fixed);
  scene.pendingUp =
    reds.length > 0
      ? reds[Math.floor(Math.random() * reds.length)]
      : greens.length > 0
        ? greens[Math.floor(Math.random() * greens.length)]
        : down;
  scene.pendingUpAt = scene.t + 0.42;
}

/* ------------------------------------------------------------ rendering */

function renderAll(scene: Scene): void {
  for (const line of scene.lines) renderLine(line);
  for (const link of scene.links) renderLink(link);
}

function renderLine(line: Line): void {
  const head = line.headX;
  let redD = '';
  let greenD = '';
  if (line.tone === 'green') {
    greenD = hseg(LEFT, head, line.y);
  } else if (line.fixed && head > line.fixX) {
    redD = hseg(LEFT, line.fixX, line.y);
    greenD = hseg(line.fixX, head, line.y);
  } else {
    redD = hseg(LEFT, head, line.y);
  }
  line.redEl.setAttribute('d', redD);
  line.greenEl.setAttribute('d', greenD);
  line.group.setAttribute('opacity', line.alpha.toFixed(2));

  for (const p of line.packets) {
    const off = p.x < LEFT;
    p.el.setAttribute('cx', off ? '-20' : String(r1(p.x)));
    p.el.setAttribute('cy', String(line.y));
    if (!off) {
      const tone = toneAt(line, p.x);
      if (tone !== p.tone) {
        p.tone = tone;
        p.el.setAttribute('class', `cd-packet cd-packet-${tone}`);
      }
    }
  }

  const b = line.branch;
  if (b) {
    b.el.setAttribute('d', branchD(b));
    if (b.packet) {
      b.packet.el.setAttribute('cx', String(r1(b.packet.x)));
      b.packet.el.setAttribute('cy', String(r1(branchY(b, b.packet.x))));
    }
  }
}

/** The splitoff path up to its head. A 45 degree elbow leaves the parent
 * lane, a straight run crosses the borrowed lane, and a rejoining spur
 * takes a mirrored elbow home. */
function branchD(b: Branch): string {
  const h = b.headX;
  if (h <= b.forkX) return '';
  const s = b.y1 > b.y0 ? 1 : -1;
  const parts = [`M${r1(b.forkX)} ${b.y0}`];
  const elbow = Math.min(h, b.forkX + LANE_PITCH);
  parts.push(`L${r1(elbow)} ${r1(b.y0 + s * (elbow - b.forkX))}`);
  if (h > b.forkX + LANE_PITCH) {
    // For a splitoff running to the edge, maxX is the drawable right bound.
    const runEnd = Math.min(h, b.rejoinX === Infinity ? b.maxX : b.rejoinX);
    if (runEnd > elbow) parts.push(`L${r1(runEnd)} ${b.y1}`);
    if (b.rejoinX !== Infinity && h > b.rejoinX) {
      const back = Math.min(h, b.rejoinX + LANE_PITCH);
      parts.push(`L${r1(back)} ${r1(b.y1 - s * (back - b.rejoinX))}`);
    }
  }
  return parts.join('');
}

function branchY(b: Branch, x: number): number {
  const s = b.y1 > b.y0 ? 1 : -1;
  if (x <= b.forkX + LANE_PITCH) return b.y0 + s * (x - b.forkX);
  if (b.rejoinX !== Infinity && x >= b.rejoinX) return b.y1 - s * (x - b.rejoinX);
  return b.y1;
}

function renderLink(link: Link): void {
  const holdEnd = LINK_DRAW_S + link.holdS;
  if (link.age < LINK_DRAW_S) {
    const u = link.age / LINK_DRAW_S;
    link.el.setAttribute('stroke-dashoffset', String(r1(link.len * (1 - easeOut(u)))));
    link.el.setAttribute('opacity', Math.min(1, u * 4).toFixed(2));
  } else if (link.age < holdEnd) {
    link.el.setAttribute('stroke-dashoffset', '0');
    link.el.setAttribute('opacity', '1');
  } else {
    const u = Math.min(1, (link.age - holdEnd) / LINK_FADE_S);
    link.el.setAttribute('opacity', (1 - u).toFixed(2));
  }
}
