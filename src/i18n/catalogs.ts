/**
 * The typed string catalogs, one per locale. Every user-facing string on the
 * main page has a key here; a missing key in either locale fails the type
 * check. The film captions and the opening quote are folded in from src/copy.ts
 * so the film keeps a single source for its words; this file adds the landing
 * chrome, the hero, and the footer.
 *
 * English is frozen: each value below is byte-identical to the static HTML it
 * replaces on first paint. Spanish uses a modern SaaS register, tu-form.
 */

import { FILM_COPY } from '../copy';

export type Locale = 'en' | 'es';

export const LOCALES: readonly Locale[] = ['en', 'es'];

export interface Catalog {
  /* Landing and site chrome, shared by both headers. */
  product: string;
  pricing: string;
  support: string;
  bookCall: string;
  /* The film's skip control. */
  skipFilm: string;
  /* The opening quote, folded from src/copy.ts. */
  quoteText: string;
  quoteAttribution: string;
  /* Film captions, folded from src/copy.ts. */
  newton1: string;
  newton2: string;
  wrights: string;
  lilienthal: string;
  nasa: string;
  armstrong: string;
  card1: string;
  card2: string;
  /* The site hero. */
  siteNote: string;
  /* The footer: tagline, the three column headings and their links, and the
     rights line. The Product column reuses product/pricing/support/bookCall. */
  footerTag: string;
  company: string;
  legal: string;
  about: string;
  blog: string;
  contact: string;
  credits: string;
  privacy: string;
  terms: string;
  cookiePolicy: string;
  rights: string;
  /* The footer theme switch (visual only): group label and the three modes. */
  theme: string;
  themeSystem: string;
  themeLight: string;
  themeDark: string;
  /* Assistive text and page metadata. */
  ariaChangeLanguage: string;
  metaDescription: string;
}

/** The strings this file owns; the rest of a Catalog is folded from the film copy. */
type ChromeStrings = Omit<
  Catalog,
  | 'quoteText'
  | 'quoteAttribution'
  | 'newton1'
  | 'newton2'
  | 'wrights'
  | 'lilienthal'
  | 'nasa'
  | 'armstrong'
  | 'card1'
  | 'card2'
>;

const CHROME: Record<Locale, ChromeStrings> = {
  en: {
    product: 'Product',
    pricing: 'Pricing',
    support: 'Support',
    bookCall: 'Book a call',
    skipFilm: 'Skip the film',
    siteNote: 'The site begins here.',
    footerTag: 'Your AI shouldn’t stand alone.',
    company: 'Company',
    legal: 'Legal',
    about: 'About',
    blog: 'Blog',
    contact: 'Contact',
    credits: 'Credits',
    privacy: 'Privacy',
    terms: 'Terms',
    cookiePolicy: 'Cookie policy',
    theme: 'Theme',
    themeSystem: 'System theme',
    themeLight: 'Light theme',
    themeDark: 'Dark theme',
    rights: '© 2026 Antaeon. All rights reserved.',
    ariaChangeLanguage: 'Change language',
    metaDescription: 'If I have seen further, it is by standing on the shoulders of Giants.',
  },
  es: {
    product: 'Producto',
    pricing: 'Precios',
    support: 'Soporte',
    bookCall: 'Reserva una llamada',
    skipFilm: 'Salta la película',
    siteNote: 'Aquí empieza el sitio.',
    footerTag: 'Tu IA no debería estar sola.',
    company: 'Empresa',
    legal: 'Legal',
    about: 'Nosotros',
    blog: 'Blog',
    contact: 'Contacto',
    credits: 'Créditos',
    privacy: 'Privacidad',
    terms: 'Términos',
    cookiePolicy: 'Política de cookies',
    theme: 'Tema',
    themeSystem: 'Tema del sistema',
    themeLight: 'Tema claro',
    themeDark: 'Tema oscuro',
    rights: '© 2026 Antaeon. Todos los derechos reservados.',
    ariaChangeLanguage: 'Cambiar idioma',
    metaDescription: 'Si he visto más lejos, es porque me he subido a hombros de gigantes.',
  },
};

function build(locale: Locale): Catalog {
  const film = FILM_COPY[locale];
  return {
    ...CHROME[locale],
    quoteText: film.quote.text,
    quoteAttribution: film.quote.attribution,
    ...film.captions,
  };
}

export const CATALOGS: Record<Locale, Catalog> = {
  en: build('en'),
  es: build('es'),
};
