/**
 * The library grid's See more, a progressive disclosure in three steps. The grid
 * ships four card-count groups of eight (8 / 16 / 24 / 32): the first eight always
 * show, the other three wait in regions below. Each click on the See more button
 * reveals the next group; after the third the control hands back to the section's
 * own Explore further link, its destination and behavior intact.
 *
 * The regions ship open in the markup, so with no script the full grid and the
 * Explore link both stand. This module collapses them into the stepper on init
 * (the section is far below the film on load, so the collapse is never seen). One
 * way throughout: no collapse back. Each reveal runs the same choreography a
 * one-shot would (measure, transition, release to auto); reduced motion snaps.
 *
 * A11y: the button is not a binary disclosure, so it carries no aria-expanded;
 * instead aria-controls names the next region it will reveal (updated each step),
 * and each region stays aria-hidden until it opens, so the newly shown cards join
 * the tree as they appear. After the last step the button gives way to the link
 * and focus follows to it.
 */

export function initLibraryMore(): void {
  const foot = document.querySelector<HTMLElement>('.section-explore-lib');
  const toggle = foot?.querySelector<HTMLButtonElement>('.explore-toggle');
  const link = foot?.querySelector<HTMLAnchorElement>('.explore-link');
  const regions = ['library-more-1', 'library-more-2', 'library-more-3'].map((id) =>
    document.getElementById(id),
  );
  if (!foot || !toggle || !link || regions.some((r) => !r)) return;
  const steps = regions as HTMLElement[];

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  // Collapse every waiting group into the stepper and swap the Explore link for
  // the See more button, which controls the first group next.
  for (const region of steps) {
    region.classList.add('is-collapsed');
    region.setAttribute('aria-hidden', 'true');
  }
  foot.classList.add('is-collapsed');
  toggle.removeAttribute('aria-expanded');
  toggle.setAttribute('aria-controls', steps[0].id);

  const reveal = (region: HTMLElement): void => {
    region.removeAttribute('aria-hidden');
    if (reduce.matches) {
      region.classList.remove('is-collapsed');
      region.classList.add('is-open');
      return;
    }
    // Measure the group's natural height, snap it to zero, then transition up and
    // release to auto, so a last-row cell's hover shadow is not clipped and a
    // later reflow (a locale swap, a resize) costs nothing.
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

  let step = 0;
  const onClick = (): void => {
    reveal(steps[step]);
    step += 1;
    if (step >= steps.length) {
      // Last group shown: hand the foot back to the Explore further link and move
      // focus to it so the tab order stays continuous. preventScroll keeps the
      // jump away from Lenis, which owns the page's scroll.
      foot.classList.remove('is-collapsed');
      toggle.removeEventListener('click', onClick);
      link.focus({ preventScroll: true });
    } else {
      // Point the button at the group it will reveal on the next click.
      toggle.setAttribute('aria-controls', steps[step].id);
    }
  };
  toggle.addEventListener('click', onClick);
}
