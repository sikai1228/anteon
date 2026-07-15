/**
 * Locale state and DOM application. The first visit reads the computer default
 * (navigator.languages, an 'es' prefix picks Spanish, otherwise English); a
 * stored manual choice wins on every later visit. Switching re-applies every
 * data-i18n string live, syncs the footer pill, updates <html lang>, and fires
 * a locale-change event the film caption engine listens for. No page reload.
 */

import type { Catalog, Locale } from './catalogs';
import { CATALOGS } from './catalogs';

export type { Locale };

const STORAGE_KEY = 'antaeon-lang';

/** The endonyms shown on the pill and options; names of languages, never translated. */
const ENDONYM: Record<Locale, string> = { en: 'English', es: 'Español' };

let current: Locale = 'en';

function isLocale(v: string | null | undefined): v is Locale {
  return v === 'en' || v === 'es';
}

/** Stored manual choice, then the computer default, then English. */
export function detectLocale(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isLocale(stored)) return stored;
  } catch {
    // localStorage can throw in private modes; fall through to the browser.
  }
  const langs =
    navigator.languages && navigator.languages.length
      ? navigator.languages
      : [navigator.language];
  for (const l of langs) {
    if (typeof l === 'string' && l.toLowerCase().startsWith('es')) return 'es';
  }
  return 'en';
}

export function getLocale(): Locale {
  return current;
}

/** The active catalog, for callers that read strings directly (the captions). */
export function msg(): Catalog {
  return CATALOGS[current];
}

function applyText(cat: Catalog): void {
  for (const el of document.querySelectorAll<HTMLElement>('[data-i18n]')) {
    const key = el.dataset.i18n;
    if (key && key in cat) el.textContent = cat[key as keyof Catalog];
  }
}

function applyAttrs(cat: Catalog): void {
  // Each element lists "attr:key" pairs, semicolon separated: the meta
  // description, and the aria-labels on the pill and the footer landmarks.
  for (const el of document.querySelectorAll<HTMLElement>('[data-i18n-attr]')) {
    const spec = el.dataset.i18nAttr;
    if (!spec) continue;
    for (const pair of spec.split(';')) {
      const i = pair.indexOf(':');
      if (i < 0) continue;
      const attr = pair.slice(0, i).trim();
      const key = pair.slice(i + 1).trim();
      if (attr && key in cat) el.setAttribute(attr, cat[key as keyof Catalog]);
    }
  }
}

/** Mirror the active locale onto the footer pill: its label and the checked option. */
function syncPill(): void {
  for (const opt of document.querySelectorAll<HTMLElement>('.lang-opt')) {
    if (opt.dataset.lang === current) opt.setAttribute('aria-current', 'true');
    else opt.removeAttribute('aria-current');
  }
  const label = document.querySelector<HTMLElement>('.lang-label');
  if (label) label.textContent = ENDONYM[current];
}

/** Fill every data-i18n node and attribute, sync the pill, set <html lang>. */
export function applyDom(): void {
  const cat = CATALOGS[current];
  applyText(cat);
  applyAttrs(cat);
  syncPill();
  document.documentElement.lang = current;
}

/** A manual choice: persist it, apply it live, and announce the change. */
export function setLocale(l: Locale): void {
  if (!isLocale(l)) return;
  try {
    localStorage.setItem(STORAGE_KEY, l);
  } catch {
    // Persistence is best-effort; the live swap still happens.
  }
  if (l === current) return;
  current = l;
  applyDom();
  window.dispatchEvent(new CustomEvent<Locale>('locale-change', { detail: l }));
}

/** Called first in boot: pick the locale and paint the DOM before anything reads copy. */
export function initI18n(): void {
  current = detectLocale();
  applyDom();
}
