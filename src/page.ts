/**
 * The shell pages' runtime: localize the chrome (the same detection,
 * persistence, and live swap the landing page uses) and wire the footer
 * preference pills. Page bodies stay static for now; the header and footer
 * behave identically on every page.
 */

import { initI18n } from './i18n/i18n';
import { wirePrefs } from './lib/prefs';

initI18n();
wirePrefs();

// The wordmark goes HOME, to the top: navigating back must not resume the
// stored film position, so the resume key clears before the link fires.
for (const w of document.querySelectorAll('a.wordmark, a.footer-brand')) {
  w.addEventListener('click', () => {
    try {
      sessionStorage.removeItem('antaeon-scroll');
    } catch {
      // No storage, nothing to clear.
    }
  });
}
