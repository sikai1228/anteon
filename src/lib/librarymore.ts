/**
 * The library grid's See more / See less, a two-way progressive disclosure over
 * four card-count groups of eight (8 / 16 / 24 / 32). The first eight always show;
 * See more reveals the next group, See less collapses the last one. See less
 * appears once the grid has stepped past eight and hides again back at eight; at
 * the full 32 the right-hand control becomes the section's own Explore further
 * link. Each step runs a measure, transition, release reveal (or its reverse for a
 * collapse); reduced motion snaps.
 *
 * The regions ship open in the markup, so with no script the full grid and the
 * Explore link both stand. This module collapses them into the stepper on init.
 * A11y: neither button is a binary disclosure, so no aria-expanded; each carries
 * aria-controls naming the region it acts on (See more the next to open, See less
 * the last open), and each region stays aria-hidden until it opens. Focus stays on
 * the button in play and moves to the control that replaces it when one vanishes
 * (to the link when See more gives way at 32, to See more when See less vanishes
 * at 8). Collapsing never yanks the viewport: the section top holds, natural
 * reflow only.
 */

export function initLibraryMore(): void {
  const foot = document.querySelector<HTMLElement>('.section-explore-lib');
  const more = foot?.querySelector<HTMLButtonElement>('.explore-toggle-more');
  const less = foot?.querySelector<HTMLButtonElement>('.explore-toggle-less');
  const link = foot?.querySelector<HTMLAnchorElement>('.explore-link');
  const regions = ['library-more-1', 'library-more-2', 'library-more-3'].map((id) =>
    document.getElementById(id),
  );
  if (!foot || !more || !less || !link || regions.some((r) => !r)) return;
  const steps = regions as HTMLElement[];

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  // Collapse every waiting group and drop it from the a11y tree; neither button is
  // a binary disclosure, so clear aria-expanded.
  for (const region of steps) {
    region.classList.add('is-collapsed');
    region.setAttribute('aria-hidden', 'true');
  }
  more.removeAttribute('aria-expanded');

  let step = 0;

  // Reflect the step in the foot: See less shows past the first group, See more
  // shows until the last, the Explore link takes over at the last, and each button
  // points at the region it will act on.
  const sync = (): void => {
    foot.classList.toggle('is-stepped', step >= 1);
    foot.classList.toggle('is-collapsed', step < steps.length);
    if (step < steps.length) more.setAttribute('aria-controls', steps[step].id);
    if (step >= 1) less.setAttribute('aria-controls', steps[step - 1].id);
  };
  sync();

  const reveal = (region: HTMLElement): void => {
    region.removeAttribute('aria-hidden');
    if (reduce.matches) {
      region.classList.remove('is-collapsed');
      region.classList.add('is-open');
      return;
    }
    region.style.height = 'auto';
    const target = region.offsetHeight;
    region.style.height = '0px';
    void region.offsetHeight;
    region.classList.remove('is-collapsed');
    const settle = (event: TransitionEvent): void => {
      if (event.propertyName !== 'height') return;
      region.removeEventListener('transitionend', settle);
      region.style.height = '';
      region.classList.add('is-open');
    };
    region.addEventListener('transitionend', settle);
    requestAnimationFrame(() => {
      region.style.height = target + 'px';
    });
  };

  const collapse = (region: HTMLElement): void => {
    region.setAttribute('aria-hidden', 'true');
    if (reduce.matches) {
      region.classList.remove('is-open');
      region.classList.add('is-collapsed');
      region.style.height = '';
      return;
    }
    // Reverse of reveal: overflow hides again so the shrinking content clips, then
    // from its current height transition down to zero and clamp with is-collapsed.
    region.classList.remove('is-open');
    region.style.height = region.offsetHeight + 'px';
    void region.offsetHeight;
    const settle = (event: TransitionEvent): void => {
      if (event.propertyName !== 'height') return;
      region.removeEventListener('transitionend', settle);
      region.classList.add('is-collapsed');
      region.style.height = '';
    };
    region.addEventListener('transitionend', settle);
    requestAnimationFrame(() => {
      region.style.height = '0px';
    });
  };

  more.addEventListener('click', () => {
    if (step >= steps.length) return;
    reveal(steps[step]);
    step += 1;
    sync();
    if (step >= steps.length) link.focus({ preventScroll: true });
  });

  less.addEventListener('click', () => {
    if (step <= 0) return;
    step -= 1;
    collapse(steps[step]);
    sync();
    if (step === 0) more.focus({ preventScroll: true });
  });
}
