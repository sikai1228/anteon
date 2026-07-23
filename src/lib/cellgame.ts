/**
 * The cell grids play a quiet game while idle. One cell puffs out at a time,
 * chosen at random and held for about a second before the next; a cell that
 * was just picked sits out the next two rounds, so the same one never repeats
 * back to back. The moment the pointer enters the grid the auto puff collapses
 * and the viewer's own hover takes over; five seconds after the pointer leaves,
 * the game resumes. It only runs while the grid is on screen, and not at all
 * under reduced motion.
 */

/** How long each cell holds its puff before the next is chosen. */
const ROUND_MS = 2000;
/** Idle time after the pointer leaves before the game resumes. */
const RESUME_MS = 5000;
/** Rounds a just-picked cell must sit out, so it never repeats immediately. */
const COOLDOWN = 2;
/** The grid must be at least this visible for the game to run. */
const IN_VIEW = 0.2;

export function initCellGame(): void {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  for (const grid of document.querySelectorAll<HTMLElement>('.cell-grid')) {
    // A section can opt its grids out of the idle puff (the library grid does):
    // hover and focus still work, only the ambient auto-select is skipped.
    if (grid.closest('[data-no-cellgame]')) continue;
    wireGrid(grid);
  }
}

function wireGrid(grid: HTMLElement): void {
  const cells = [...grid.querySelectorAll<HTMLElement>('.cell')];
  // With fewer than COOLDOWN + 1 cells the cooldown would empty the pool.
  if (cells.length <= COOLDOWN) return;

  let roundTimer = 0;
  let resumeTimer = 0;
  let recent: number[] = [];
  let inView = false;
  let userControl = false;
  let current = -1;

  const clearPuff = (): void => {
    if (current >= 0) cells[current].classList.remove('is-puffed');
    current = -1;
  };

  const step = (): void => {
    if (!inView || userControl) return;
    clearPuff();
    // Every index except the last COOLDOWN picks is fair game.
    const pool: number[] = [];
    for (let i = 0; i < cells.length; i += 1) {
      if (!recent.includes(i)) pool.push(i);
    }
    const idx = pool[Math.floor(Math.random() * pool.length)];
    current = idx;
    cells[idx].classList.add('is-puffed');
    recent.push(idx);
    while (recent.length > COOLDOWN) recent.shift();
  };

  const startGame = (): void => {
    stopGame();
    if (!inView || userControl) return;
    step();
    roundTimer = window.setInterval(step, ROUND_MS);
  };

  const stopGame = (): void => {
    if (roundTimer) window.clearInterval(roundTimer);
    roundTimer = 0;
  };

  // The pointer entering the grid hands control to the viewer at once: the
  // auto puff collapses, the game pauses, and the viewer's hover drives the
  // puff through the CSS.
  grid.addEventListener('pointerenter', () => {
    if (resumeTimer) window.clearTimeout(resumeTimer);
    resumeTimer = 0;
    userControl = true;
    stopGame();
    clearPuff();
  });

  // Leaving arms the resume: five quiet seconds and the game plays again.
  grid.addEventListener('pointerleave', () => {
    if (resumeTimer) window.clearTimeout(resumeTimer);
    resumeTimer = window.setTimeout(() => {
      userControl = false;
      startGame();
    }, RESUME_MS);
  });

  new IntersectionObserver(
    (entries) => {
      inView = entries[0]?.isIntersecting ?? false;
      if (inView) startGame();
      else {
        stopGame();
        clearPuff();
      }
    },
    { threshold: IN_VIEW },
  ).observe(grid);
}
