/**
 * The shell pages' runtime: mount the shared chrome (the header and footer
 * come from site-chrome.ts, the same bytes every page renders), localize it
 * (the same detection, persistence, and live swap the landing page uses),
 * and wire the footer preference pills. Page bodies stay static for now;
 * the header and footer behave identically on every page.
 */

// The side effect mounts the chrome; imports run before the calls below,
// so the header and footer exist by the time i18n and prefs read the DOM.
import './lib/site-chrome';
import { initI18n } from './i18n/i18n';
import { wirePrefs } from './lib/prefs';

initI18n();
wirePrefs();

// The wordmark goes home to the landing page, not the film: the resume key
// carries a site sentinel before the link fires, and the film runtime boots
// straight onto the risen page instead of the trailer.
for (const w of document.querySelectorAll('a.site-wordmark, a.footer-brand')) {
  w.addEventListener('click', () => {
    try {
      sessionStorage.setItem('anteon-scroll', 'site');
    } catch {
      // No storage; index will start from the film's top instead.
    }
  });
}
