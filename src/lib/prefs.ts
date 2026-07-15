/**
 * The footer preference controls, one wiring for every page: the language
 * pill (a native details menu with the expected dismissals; choosing hands
 * the locale to setLocale, which swaps every data-i18n string live) and the
 * theme pill (selection state only for now; no theme engine sits behind it
 * yet). The landing page and every shell page call this, so the footer
 * behaves identically no matter where it renders.
 */

import { setLocale } from '../i18n/i18n';

export function wirePrefs(): void {
  const lang = document.querySelector<HTMLDetailsElement>('.lang');
  if (lang) {
    const close = () => lang.removeAttribute('open');
    document.addEventListener('pointerdown', (e) => {
      if (lang.open && !lang.contains(e.target as Node)) close();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && lang.open) close();
    });
    document.addEventListener('focusin', (e) => {
      if (lang.open && !lang.contains(e.target as Node)) close();
    });
    for (const opt of lang.querySelectorAll<HTMLButtonElement>('.lang-opt')) {
      opt.addEventListener('click', () => {
        const l = opt.dataset.lang;
        if (l === 'en' || l === 'es') setLocale(l);
        close();
      });
    }
  }

  const themeSwitch = document.querySelector<HTMLElement>('.theme-switch');
  if (themeSwitch) {
    const opts = [...themeSwitch.querySelectorAll<HTMLButtonElement>('.theme-opt')];
    for (const opt of opts) {
      opt.addEventListener('click', () => {
        for (const o of opts) {
          o.setAttribute('aria-checked', o === opt ? 'true' : 'false');
          o.classList.toggle('is-active', o === opt);
        }
      });
    }
  }

  // The small-screen menu: each header's toggle opens its own nav as a
  // dropdown sheet; picking a link, tapping outside, or Escape closes it.
  const toggles = [...document.querySelectorAll<HTMLButtonElement>('.nav-toggle')];
  const closeAll = (): void => {
    for (const t of toggles) {
      t.parentElement?.classList.remove('nav-open');
      t.setAttribute('aria-expanded', 'false');
    }
  };
  for (const btn of toggles) {
    const host = btn.parentElement;
    if (!host) continue;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = !host.classList.contains('nav-open');
      closeAll();
      host.classList.toggle('nav-open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    host.querySelector('.header-nav')?.addEventListener('click', closeAll);
  }
  if (toggles.length) {
    document.addEventListener('pointerdown', (e) => {
      const open = document.querySelector('.nav-open');
      if (open && !open.contains(e.target as Node)) closeAll();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeAll();
    });
  }
}
