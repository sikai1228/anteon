/**
 * The library grid's show more. The grid ships four rows; the last four wait in
 * a region below, hidden on load. The control under the grid starts as a See
 * more button and, on the one expansion, hands back to the section's own Explore
 * further link, its original destination and behavior intact.
 *
 * The region ships open in the markup, so with no script the full grid and the
 * Explore link both stand. This module collapses it into a disclosure on init
 * (the section is far below the film on load, so the collapse is never seen) and
 * reveals it once on click. One way: no collapse back. Under reduced motion the
 * rows snap open with no height animation; otherwise the region grows from zero
 * to its measured height, then releases to auto so a later reflow (a locale
 * swap, a resize) costs nothing.
 */

export function initLibraryMore(): void {
  const region = document.getElementById('library-more');
  const foot = document.querySelector<HTMLElement>('.section-explore-lib');
  const toggle = foot?.querySelector<HTMLButtonElement>('.explore-toggle');
  const link = foot?.querySelector<HTMLAnchorElement>('.explore-link');
  if (!region || !foot || !toggle || !link) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  // Turn the shipped-open region into a disclosure: clip the extra rows, show
  // the See more button in place of the Explore link, and drop the hidden rows
  // from the a11y tree until they are revealed.
  region.classList.add('is-collapsed');
  region.setAttribute('aria-hidden', 'true');
  foot.classList.add('is-collapsed');
  toggle.setAttribute('aria-expanded', 'false');

  const open = (): void => {
    // Hand the foot back to the original Explore further link and rejoin the
    // revealed rows to the a11y tree.
    foot.classList.remove('is-collapsed');
    region.removeAttribute('aria-hidden');
    toggle.setAttribute('aria-expanded', 'true');
    // Keyboard focus followed the control that just vanished; move it to the
    // link the control became, so the tab order stays continuous. preventScroll
    // keeps the jump away from Lenis, which owns the page's scroll.
    link.focus({ preventScroll: true });

    if (reduce.matches) {
      region.classList.remove('is-collapsed');
      region.classList.add('is-open');
      return;
    }

    // Measure the region's natural height, snap it back to zero, then transition
    // up to that height. On arrival, release to auto and let overflow show again
    // so a last-row cell's hover shadow is not clipped.
    region.style.height = 'auto';
    const target = region.offsetHeight;
    region.style.height = '0px';
    void region.offsetHeight; // force the zero to take before the transition
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

  toggle.addEventListener('click', open, { once: true });
}
