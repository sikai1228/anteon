/**
 * The film's words, per locale. Edit the on-screen film copy here only; the
 * landing chrome and footer strings live in src/i18n/catalogs.ts, which folds
 * this copy into the per-locale catalogs so the film keeps a single source.
 *
 * The English is user-approved and frozen: it stays byte-identical to the
 * static HTML first paint. The Spanish matches its register, tu-form and plain.
 */

export interface FilmCopy {
  quote: {
    text: string;
    attribution: string;
  };
  captions: {
    newton1: string;
    newton2: string;
    wrights: string;
    lilienthal: string;
    nasa: string;
    armstrong: string;
    card1: string;
    card2: string;
  };
}

// The attribution carries an em dash then a non-breaking space ( ), the
// same pair the HTML writes as &mdash;&nbsp;, so applyDom leaves the English
// first paint byte-identical. It reads the same in both locales (a proper name).
const NEWTON = '— Sir Isaac Newton';

export const FILM_COPY: Record<'en' | 'es', FilmCopy> = {
  en: {
    quote: {
      text: '“If I have seen further, it is by standing on the shoulders of Giants.”',
      attribution: NEWTON,
    },
    captions: {
      newton1: 'Newton stood on Galileo.',
      newton2: 'And Kepler. And Barrow.',
      wrights: 'The Wright brothers stood on Newton.',
      lilienthal: 'Lilienthal’s numbers were wrong. They built a wind tunnel and fixed them.',
      nasa: 'NASA stood on the Wright brothers.',
      armstrong: 'Armstrong carried a piece of their design to the Moon.',
      card1: 'Every giant stood on another.',
      card2: 'Your AI shouldn’t stand alone.',
    },
  },
  es: {
    quote: {
      // A faithful literary rendering of Newton's line, in the idiom Spanish
      // science writing keeps for it: "a hombros de gigantes".
      text: '“Si he visto más lejos, es porque me he subido a hombros de gigantes.”',
      attribution: NEWTON,
    },
    captions: {
      newton1: 'Newton se apoyó en Galileo.',
      newton2: 'Y en Kepler. Y en Barrow.',
      wrights: 'Los hermanos Wright se apoyaron en Newton.',
      lilienthal: 'Las cifras de Lilienthal estaban mal. Construyeron un túnel de viento y las corrigieron.',
      nasa: 'La NASA se apoyó en los hermanos Wright.',
      armstrong: 'Armstrong llevó una parte de su diseño a la Luna.',
      card1: 'Cada gigante se apoyó en otro.',
      card2: 'Tu IA no debería estar sola.',
    },
  },
};

export type CaptionKey = keyof FilmCopy['captions'];
