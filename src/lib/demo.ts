/**
 * The hero terminal demo: one scripted race, two panes, rendered in the
 * idiom of a real agent CLI. User prompts sit in bordered "> " blocks;
 * tool calls are dot-bulleted lines with elbow results beneath; the plain
 * assistant thinks out loud behind a pulsing working glyph that each next
 * step replaces. Anteon answers in about five seconds with its results
 * check-marked; the other side stalls, fails the file search, receives
 * the user's upload, and limps to the same answer a minute later, its
 * older lines scrolling out of the frame as it grinds on. No clocks and
 * no duration lines anywhere: the speed speaks for itself.
 * Each pane's head carries an API cost ticker at Opus 4.8 prices, ticking
 * once per finished AI message: Anteon's engines are not model calls, so
 * its side stays at zero until the one closing message; the other side
 * ticks up on every message it writes.
 *
 * The script is data (one event list), so retiming is data editing. One
 * token-guarded rAF clock drives both panes: the race starts in view,
 * pauses off screen, and holds its end state; stale frame chains die on
 * the token check, so re-entry can never double the clock. The fast
 * forward control multiplies the race clock; at the finish it becomes the
 * reset, and a click replays from the top at real time. Reduced motion
 * renders both final states standing still. The
 * terminal speaks static English on purpose: a depicted demo, outside
 * the page's i18n.
 */

type PaneId = 'a' | 'b';

type EventKind = 'user' | 'tool' | 'out' | 'say' | 'work' | 'fail' | 'prompt';

interface DemoEvent {
  pane: PaneId | 'both';
  /** ms from cycle start */
  at: number;
  kind: EventKind;
  text: string;
  /** Cumulative API spend in USD once this message is done, at Opus 4.8
   * prices ($5/M input, $25/M output). Only AI-written messages carry one;
   * engine calls are not model calls and never move the ticker. */
  cost?: number;
}

interface PaneEvent {
  pane: PaneId;
  at: number;
  kind: EventKind;
  text: string;
  cost?: number;
}

/** Typing speed for the right pane's prose, ms per character. */
const TYPE_MS = 32;
/** How much of the terminal must be visible before the race runs. */
const IN_VIEW = 0.4;
/** The fast forward control's clock multiplier while engaged. */
const FF_SPEED = 8;
/** The race is over at this point on the clock: every beat has fired, the
 * rival's late answer has finished typing, and both panes rest. No auto
 * replay; the fast forward control turns into a reset control and a click
 * starts the race over. */
const LAST_MS = 66000;

const SCRIPT: readonly DemoEvent[] = [
  {
    pane: 'both',
    at: 0,
    kind: 'user',
    text: 'Convert the Q2 supplier datasheet to CSV, give me spend totals by vendor with variance vs Q1, and check if policy requires an audit of the procurement team.',
  },

  // Anteon: no upload needed, the firm's own library holds the data.
  // Each engine call lands with its elbow results in the same breath.
  { pane: 'a', at: 500, kind: 'tool', text: 'engine · database' },
  { pane: 'a', at: 900, kind: 'out', text: 'supplier_q2 pulled from company database' },
  { pane: 'a', at: 1400, kind: 'tool', text: 'engine · convert' },
  { pane: 'a', at: 1700, kind: 'out', text: 'converted → supplier_q2.csv' },
  { pane: 'a', at: 2200, kind: 'tool', text: 'engine · tabular ops' },
  { pane: 'a', at: 2500, kind: 'out', text: 'totals: 14 vendors · $2,418,644' },
  { pane: 'a', at: 2700, kind: 'out', text: 'variance vs Q1: +4.2%' },
  { pane: 'a', at: 3300, kind: 'tool', text: 'engine · policy database scan' },
  { pane: 'a', at: 3600, kind: 'out', text: 'audit required → yes, §7.2(b), Vendor Audit Policy' },
  {
    pane: 'a',
    at: 4300,
    kind: 'say',
    text: 'Done, supplier_q2 is converted. An audit is required under §7.2(b), Vendor Audit Policy.',
    cost: 0.02,
  },
  { pane: 'a', at: 5300, kind: 'prompt', text: '' },

  // The plain assistant: announcements, a pulsing working glyph that each
  // next step replaces, a failed search, the user's upload, and the same
  // answer as the other pane, a minute late.
  { pane: 'b', at: 1200, kind: 'say', text: 'Let me look for the Q2 datasheet first…', cost: 0.01 },
  { pane: 'b', at: 2600, kind: 'work', text: 'Searching files' },
  { pane: 'b', at: 10500, kind: 'say', text: 'Found it. Converting the file format now…', cost: 0.11 },
  { pane: 'b', at: 12200, kind: 'work', text: 'Converting' },
  { pane: 'b', at: 19500, kind: 'say', text: 'Now let me group the data and run the math…', cost: 0.29 },
  { pane: 'b', at: 21200, kind: 'work', text: 'Computing' },
  { pane: 'b', at: 28500, kind: 'say', text: 'Searching your desktop for the company guidelines…', cost: 0.47 },
  { pane: 'b', at: 30200, kind: 'work', text: 'Searching' },
  { pane: 'b', at: 37500, kind: 'fail', text: 'I could not find the policy document.', cost: 0.63 },
  { pane: 'b', at: 39000, kind: 'say', text: 'Could you upload the guideline file?', cost: 0.68 },
  { pane: 'b', at: 43000, kind: 'user', text: 'vendor_audit_guideline.pdf attached' },
  { pane: 'b', at: 45500, kind: 'say', text: 'Reading vendor_audit_guideline.pdf…', cost: 1.02 },
  { pane: 'b', at: 47200, kind: 'work', text: 'Reading' },
  { pane: 'b', at: 52000, kind: 'say', text: 'Checking which sections apply to procurement…', cost: 1.31 },
  { pane: 'b', at: 53700, kind: 'work', text: 'Checking' },
  {
    pane: 'b',
    at: 60000,
    kind: 'say',
    text: 'All done. supplier_q2.csv is ready, the spend totals and variance are computed, and an audit of the procurement team is required under §7.2(b), Vendor Audit Policy.',
    cost: 1.58,
  },
  { pane: 'b', at: 65600, kind: 'prompt', text: '' },
];

interface Pane {
  id: PaneId;
  lines: HTMLElement;
  cursor: HTMLElement;
  costEl: HTMLElement | null;
}

interface Typer {
  pane: Pane;
  el: HTMLElement;
  text: string;
  from: number;
  shown: number;
  /** Cumulative spend shown the moment this message finishes typing. */
  cost?: number;
}

/** The ticker moves in discrete steps, one per finished AI message. */
function setCost(pane: Pane, usd: number): void {
  if (pane.costEl) pane.costEl.textContent = 'API cost: $' + usd.toFixed(2);
}

/** Follow the newest line, but land the scroll on a whole line boundary:
 * the transcript's visible top is always a full line, never a slice, and
 * both panes share the same top edge under their heads. */
function snapScroll(pane: Pane): void {
  const box = pane.lines;
  const max = box.scrollHeight - box.clientHeight;
  if (max <= 0) {
    box.scrollTop = 0;
    return;
  }
  const kids = box.children;
  if (!kids.length) return;
  const base = (kids[0] as HTMLElement).offsetTop;
  let snap = max;
  for (let i = kids.length - 1; i >= 0; i -= 1) {
    const t = (kids[i] as HTMLElement).offsetTop - base;
    if (t <= max) {
      snap = t;
      break;
    }
  }
  box.scrollTop = snap;
}

function isTyped(kind: EventKind): boolean {
  return kind === 'say' || kind === 'fail';
}

/** Build one transcript line in the CLI idiom of its kind. */
function makeLine(pane: PaneId, kind: EventKind, text: string): { line: HTMLElement; textEl: HTMLElement } {
  const line = document.createElement('div');
  const textEl = document.createElement('span');
  textEl.className = 'term-text';
  const glyph = (cls: string, g: string): HTMLElement => {
    const s = document.createElement('span');
    s.className = cls;
    s.textContent = g;
    return s;
  };
  switch (kind) {
    case 'user':
      // The prompt block: a bordered quote, the way a CLI shows what you sent.
      line.className = 'term-line term-user';
      line.append(glyph('term-glyph term-caret', '>'));
      textEl.textContent = text;
      break;
    case 'tool':
      // A tool call: the agent dot, then the engine's name.
      line.className = 'term-line term-tool';
      line.append(glyph('term-glyph term-dot', '⏺'));
      textEl.textContent = text;
      break;
    case 'out': {
      // An elbow result under its tool call; Anteon's results carry the check.
      line.className = 'term-line term-out';
      line.append(glyph('term-glyph term-elbow', '⎿'));
      textEl.textContent = text;
      line.append(textEl);
      if (pane === 'a') line.append(glyph('term-mark term-ok', '✓'));
      return { line, textEl };
    }
    case 'say':
      // Plain assistant prose behind the same dot, unfilled.
      line.className = 'term-line term-say';
      line.append(glyph('term-glyph term-dot-soft', '⏺'));
      textEl.textContent = text;
      break;
    case 'work':
      // The transient working glyph; the next step replaces it.
      line.className = 'term-line term-work';
      line.append(glyph('term-glyph term-spin', '✳'));
      textEl.textContent = text + '…';
      break;
    case 'fail':
      line.className = 'term-line term-fail';
      line.append(glyph('term-glyph term-x', '✗'));
      textEl.textContent = text;
      break;
    case 'prompt':
      line.className = 'term-line term-rest';
      line.append(glyph('term-glyph term-caret', '❯'));
      break;
  }
  line.append(textEl);
  return { line, textEl };
}

export function initTerminalDemo(): void {
  const body = document.querySelector<HTMLElement>('.hero-terminal .terminal-body');
  if (!body || body.dataset.demoInit === '1') return;
  body.dataset.demoInit = '1';
  const ffBtn = document.querySelector<HTMLButtonElement>('.hero-terminal .term-ff');

  const panes: Pane[] = [];
  for (const id of ['a', 'b'] as const) {
    const root = body.querySelector<HTMLElement>(`.term-pane[data-pane="${id}"]`);
    const lines = root?.querySelector<HTMLElement>('.term-lines') ?? null;
    if (!lines) return;
    const cursor = document.createElement('span');
    cursor.className = 'term-cursor';
    panes.push({ id, lines, cursor, costEl: root?.querySelector<HTMLElement>('.term-cost') ?? null });
  }
  const byId = (id: PaneId): Pane => (id === 'a' ? panes[0] : panes[1]);

  // A 'both' event fires the same line in the two panes at the same instant.
  const schedule: PaneEvent[] = [];
  for (const ev of SCRIPT) {
    if (ev.pane === 'both') {
      schedule.push({ pane: 'a', at: ev.at, kind: ev.kind, text: ev.text });
      schedule.push({ pane: 'b', at: ev.at, kind: ev.kind, text: ev.text });
    } else {
      schedule.push({ pane: ev.pane, at: ev.at, kind: ev.kind, text: ev.text, cost: ev.cost });
    }
  }
  schedule.sort((x, y) => x.at - y.at);

  // Reduced motion: no race. Both panes render their final states, the
  // story told standing still: Anteon complete, the other side frozen
  // mid-grind on its working line.
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    // No race to hurry: the control leaves with the motion.
    ffBtn?.remove();
    for (const ev of schedule) {
      const pane = byId(ev.pane);
      if (ev.kind !== 'work') {
        const prev = pane.lines.querySelector('.term-work');
        if (prev) prev.remove();
      }
      const kept = pane.lines.querySelector('.term-work');
      if (ev.kind === 'work' && kept) kept.remove();
      pane.lines.append(makeLine(ev.pane, ev.kind, ev.text).line);
      if (ev.cost !== undefined) setCost(pane, ev.cost);
    }
    for (const p of panes) snapScroll(p);
    return;
  }

  let elapsed = 0;
  let lastNow = 0;
  let fired = 0;
  let running = false;
  let runToken = 0;
  let speed = 1;
  let finished = false;
  let typers: Typer[] = [];

  // The fast forward control, bottom right of the card: one click runs the
  // race at FF_SPEED, another returns it to real time. Once the race is
  // over the same control is the reset, and a click starts the race again
  // from the top, back at real time.
  ffBtn?.addEventListener('click', () => {
    if (finished) {
      finished = false;
      resetPanes();
      ffBtn.classList.remove('is-reset');
      ffBtn.title = 'Fast forward';
      return;
    }
    speed = speed === 1 ? FF_SPEED : 1;
    ffBtn.classList.toggle('is-on', speed !== 1);
  });

  function fire(ev: PaneEvent): void {
    const pane = byId(ev.pane);
    // Each new step retires the pane's transient working line.
    const working = pane.lines.querySelector('.term-work');
    if (working) working.remove();
    const { line, textEl } = makeLine(ev.pane, ev.kind, ev.text);
    // Only the plain assistant typewrites; Anteon's pane lands whole,
    // instant output being the point of it.
    if (isTyped(ev.kind) && ev.pane === 'b') {
      textEl.textContent = '';
      typers.push({ pane, el: textEl, text: ev.text, from: ev.at, shown: 0, cost: ev.cost });
    } else if (ev.cost !== undefined) {
      // An instant message is done the moment it lands; its tick fires now.
      setCost(pane, ev.cost);
    }
    // The cursor rides the newest line of its pane, except working lines:
    // their glyph already pulses, and two flickers fight each other.
    if (ev.kind === 'work') pane.cursor.remove();
    else line.append(pane.cursor);
    pane.lines.append(line);
    snapScroll(pane);
  }

  function resetPanes(): void {
    for (const p of panes) {
      p.cursor.remove();
      p.lines.replaceChildren();
      setCost(p, 0);
    }
    typers = [];
    fired = 0;
    elapsed = 0;
    speed = 1;
    ffBtn?.classList.remove('is-on');
  }

  function frame(now: number, token: number): void {
    // Stale chains die here: only the newest start()'s token advances time.
    if (!running || token !== runToken) return;
    if (document.hidden) {
      // A hidden tab throttles rAF; hold the race clock until it returns.
      lastNow = now;
      requestAnimationFrame((n) => frame(n, token));
      return;
    }
    // Clamp the step so a throttled or resumed frame cannot teleport the race.
    elapsed += Math.min(now - lastNow, 500) * speed;
    lastNow = now;

    while (fired < schedule.length && schedule[fired].at <= elapsed) {
      fire(schedule[fired]);
      fired += 1;
    }

    for (let i = typers.length - 1; i >= 0; i -= 1) {
      const t = typers[i];
      const n = Math.min(t.text.length, Math.max(0, Math.floor((elapsed - t.from) / TYPE_MS)));
      if (n > t.shown) {
        t.shown = n;
        t.el.textContent = t.text.slice(0, n);
        snapScroll(t.pane);
      }
      if (t.shown >= t.text.length) {
        // The message is done: its cost tick lands with the last character.
        if (t.cost !== undefined) setCost(t.pane, t.cost);
        typers.splice(i, 1);
      }
    }

    // The race ends standing: the finish state stays up, and the fast
    // forward control becomes the reset.
    if (!finished && elapsed >= LAST_MS) {
      finished = true;
      speed = 1;
      if (ffBtn) {
        ffBtn.classList.remove('is-on');
        ffBtn.classList.add('is-reset');
        ffBtn.title = 'Play again';
      }
    }

    requestAnimationFrame((n) => frame(n, token));
  }

  function start(): void {
    if (running) return;
    running = true;
    runToken += 1;
    const token = runToken;
    lastNow = performance.now();
    requestAnimationFrame((n) => frame(n, token));
  }

  // The race runs only while the terminal is on screen; off screen the
  // loop halts, resuming where it paused.
  const frameEl = body.closest<HTMLElement>('.hero-terminal') ?? body;
  new IntersectionObserver(
    (entries) => {
      if (entries[0]?.isIntersecting) start();
      else running = false;
    },
    { threshold: IN_VIEW },
  ).observe(frameEl);
}
