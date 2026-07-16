/**
 * The footer preference controls, one wiring for every page: the language
 * pill (a native details menu with the expected dismissals; choosing hands
 * the locale to setLocale, which swaps every data-i18n string live) and the
 * theme pill (three modes, light, dark, and system, set on the root as
 * data-theme and remembered in storage). The landing page and every shell
 * page call this, so the footer behaves identically no matter where it renders.
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

  // The theme pill: three modes remembered across pages and visits. The
  // head's pre-paint script has already set data-theme from storage before
  // first paint; this wires the pill to change it and reflects the stored
  // choice on load. The three options are System, Light, Dark in DOM order, so
  // the index maps to the mode and the shared footer needs no per-page marker.
  const themeSwitch = document.querySelector<HTMLElement>('.theme-switch');
  if (themeSwitch) {
    const opts = [...themeSwitch.querySelectorAll<HTMLButtonElement>('.theme-opt')];
    const MODES = ['system', 'light', 'dark'] as const;
    type Mode = (typeof MODES)[number];
    const reflect = (mode: Mode): void => {
      opts.forEach((o, i) => {
        const on = MODES[i] === mode;
        o.setAttribute('aria-checked', on ? 'true' : 'false');
        o.classList.toggle('is-active', on);
      });
    };
    const stored = (): Mode => {
      try {
        const v = localStorage.getItem('anteon-theme');
        if (v === 'light' || v === 'dark') return v;
      } catch {
        // Private mode can throw on read; fall through to system.
      }
      return 'system';
    };
    const apply = (mode: Mode): void => {
      document.documentElement.setAttribute('data-theme', mode);
      try {
        localStorage.setItem('anteon-theme', mode);
      } catch {
        // Private mode can throw on write; the choice holds for this page only.
      }
      reflect(mode);
    };
    opts.forEach((opt, i) => {
      opt.addEventListener('click', () => apply(MODES[i]));
    });
    // Match the pill to what the pre-paint script already applied.
    reflect(stored());
  }

  // The Product mega menu: hovering the trigger drops the platform panel,
  // the header appearing to extend downward. A short close delay bridges
  // the gap between the trigger and the panel below it. The trigger also
  // toggles on click (touch and keyboard), and Escape closes. On small
  // screens the panel is always laid out in the hamburger sheet, so this
  // wiring is inert there (mouseenter does not fire on touch, and a click
  // is stopped from closing the sheet).
  const megaClose = new Map<Element, number>();
  const closeMega = (header: Element, trigger: Element): void => {
    header.classList.remove('mega-open');
    trigger.setAttribute('aria-expanded', 'false');
  };
  for (const mega of document.querySelectorAll<HTMLElement>('.nav-mega')) {
    const header = mega.closest('#chrome, #site-header, .page-header');
    const trigger = mega.querySelector<HTMLElement>('.nav-mega-trigger');
    if (!header || !trigger) continue;
    const openMega = (): void => {
      const t = megaClose.get(header);
      if (t) window.clearTimeout(t);
      header.classList.add('mega-open');
      trigger.setAttribute('aria-expanded', 'true');
    };
    const scheduleClose = (): void => {
      const t = megaClose.get(header);
      if (t) window.clearTimeout(t);
      megaClose.set(header, window.setTimeout(() => closeMega(header, trigger), 140));
    };
    // Open only when the pointer is on the Product trigger, not anywhere on
    // the bar (the frosted panel spans the full header). It stays open while
    // the pointer is anywhere in the header, the expanded panel included
    // since it is a descendant, and collapses when the pointer leaves.
    trigger.addEventListener('mouseenter', openMega);
    header.addEventListener('mouseleave', scheduleClose);
    trigger.addEventListener('focus', openMega);
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (header.classList.contains('mega-open')) closeMega(header, trigger);
      else openMega();
    });
    for (const card of mega.querySelectorAll('.mega-card')) {
      card.addEventListener('click', () => closeMega(header, trigger));
    }
  }
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    for (const open of document.querySelectorAll('.mega-open')) {
      const trig = open.querySelector('.nav-mega-trigger');
      open.classList.remove('mega-open');
      trig?.setAttribute('aria-expanded', 'false');
    }
  });

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
