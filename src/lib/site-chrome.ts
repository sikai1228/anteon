/**
 * The one site chrome. The header and the footer are defined here, once, and
 * nowhere else: every page carries two empty mounts (<header id="site-header">
 * and <footer class="site-footer">) and this module fills them the moment it
 * runs, before any i18n or wiring reads the DOM. The markup is the landing
 * page's header and footer, so every page shows the same chrome from the same
 * bytes and a link can never go missing on one page only.
 *
 * The only per-page difference is computed, never authored: aria-current on
 * the nav link whose target is the page itself. chrome.css styles everything
 * rendered here; prefs.ts wires the mega menu, the small-screen sheet, and
 * the footer pills after the mount, on the landing and the shells alike.
 *
 * The chrome also owns the auth dialog: one native <dialog> appended to the
 * body on every page, holding the sign in, create account, and reset
 * password views the three standalone pages used to carry. The Get started
 * controls (the shared header's and the film header's) open it in place of
 * navigating. auth.css rides this module, so the dialog is styled wherever
 * the chrome renders.
 */

import '../auth.css';

const HEADER_HTML = `
      <a class="site-wordmark" href="./index.html"><span class="brand-mark" aria-hidden="true"><img class="hand-l" src="/logo/hand-l.png" alt="" /><img class="hand-r" src="/logo/hand-r.png" alt="" /><img class="spark" src="/logo/spark.png" alt="" /></span>Anteon</a>
      <nav class="header-nav">
        <div class="nav-mega"><button type="button" class="nav-mega-trigger" aria-expanded="false" aria-haspopup="true"><span data-i18n="product">Solutions</span><svg class="nav-mega-chev" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button><div class="nav-mega-panel"><div class="mega-grid"><a class="mega-card" href="./engine.html"><span class="mega-card-media" aria-hidden="true"><img class="mark-light" src="/media/mega-engines-light.jpg" alt="" loading="lazy" decoding="async" /><img class="mark-dark" src="/media/mega-engines-dark.jpg" alt="" loading="lazy" decoding="async" /></span><span class="mega-card-title" data-i18n="megaEnginesTitle">Engine database</span><span class="mega-card-sub" data-i18n="megaEnginesSub">1,000+ deterministic engines and the intelligence layer that guides your AI to call them</span></a><a class="mega-card" href="./api.html"><span class="mega-card-media" aria-hidden="true"><img class="mark-light" src="/media/mega-apis-light.jpg" alt="" loading="lazy" decoding="async" /><img class="mark-dark" src="/media/mega-apis-dark.jpg" alt="" loading="lazy" decoding="async" /></span><span class="mega-card-title" data-i18n="megaApisTitle">API database</span><span class="mega-card-sub" data-i18n="megaApisSub">A hand-vetted, continuously updated index of the top APIs on the internet</span></a><a class="mega-card" href="./personal.html"><span class="mega-card-media" aria-hidden="true"><img class="mark-light" src="/media/mega-library-light.jpg" alt="" loading="lazy" decoding="async" /><img class="mark-dark" src="/media/mega-library-dark.jpg" alt="" loading="lazy" decoding="async" /></span><span class="mega-card-title" data-i18n="megaLibraryTitle">Personal database</span><span class="mega-card-sub" data-i18n="megaLibrarySub">Unique engines, compiled from your firm&rsquo;s unique work and shared across your team</span></a></div></div></div>
        <a href="./pricing.html" data-i18n="pricing">Pricing</a>
        <a href="./api-key.html" data-i18n="apiKey">API / MCP</a>
        <a href="./pricing.html#enterprise" data-i18n="enterprise">Enterprise</a>
        <button type="button" class="book-call" data-auth="open"><span class="bc-label" data-i18n="getStarted">Get started</span><span class="bc-arrow" aria-hidden="true"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 7h10v10"/><path d="M7 17 17 7"/></svg></span></button>
      </nav>
      <button type="button" class="nav-toggle" aria-expanded="false" aria-label="Menu" data-i18n-attr="aria-label:ariaMenu"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/></svg></button>
`;

const FOOTER_HTML = `
      <div class="footer-inner">
        <div class="footer-brandcol">
          <a class="footer-brand" href="./index.html"><span class="brand-mark" aria-hidden="true"><img class="hand-l" src="/logo/hand-l.png" alt="" /><img class="hand-r" src="/logo/hand-r.png" alt="" /><img class="spark" src="/logo/spark.png" alt="" /></span>Anteon</a>
          <p class="footer-tag" data-i18n="footerTag">Solved problems should stay solved</p>
        </div>
        <nav class="footer-col" aria-label="Solutions" data-i18n-attr="aria-label:product">
          <h2 class="footer-h" data-i18n="product">Solutions</h2>
          <a href="./engine.html"><span data-i18n="megaEnginesTitle">Engine database</span><svg class="footer-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 7h10v10"/><path d="M7 17 17 7"/></svg></a>
          <a href="./api.html"><span data-i18n="megaApisTitle">API database</span><svg class="footer-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 7h10v10"/><path d="M7 17 17 7"/></svg></a>
          <a href="./personal.html"><span data-i18n="megaLibraryTitle">Personal database</span><svg class="footer-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 7h10v10"/><path d="M7 17 17 7"/></svg></a>
          <a href="./pricing.html"><span data-i18n="pricing">Pricing</span><svg class="footer-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 7h10v10"/><path d="M7 17 17 7"/></svg></a>
          <a href="./api-key.html"><span data-i18n="apiKey">API / MCP</span><svg class="footer-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 7h10v10"/><path d="M7 17 17 7"/></svg></a>
          <a href="./pricing.html#enterprise"><span data-i18n="enterprise">Enterprise</span><svg class="footer-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 7h10v10"/><path d="M7 17 17 7"/></svg></a>
          <a href="./support.html"><span data-i18n="support">Support</span><svg class="footer-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 7h10v10"/><path d="M7 17 17 7"/></svg></a>
        </nav>
        <nav class="footer-col" aria-label="Company" data-i18n-attr="aria-label:company">
          <h2 class="footer-h" data-i18n="company">Company</h2>
          <a href="./about.html"><span data-i18n="about">About</span><svg class="footer-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 7h10v10"/><path d="M7 17 17 7"/></svg></a>
          <a href="./blog.html"><span data-i18n="blog">Blog</span><svg class="footer-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 7h10v10"/><path d="M7 17 17 7"/></svg></a>
          <a href="./contact.html"><span data-i18n="contact">Contact</span><svg class="footer-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 7h10v10"/><path d="M7 17 17 7"/></svg></a>
        </nav>
        <nav class="footer-col" aria-label="Legal" data-i18n-attr="aria-label:legal">
          <h2 class="footer-h" data-i18n="legal">Legal</h2>
          <a href="./privacy.html"><span data-i18n="privacy">Privacy</span><svg class="footer-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 7h10v10"/><path d="M7 17 17 7"/></svg></a>
          <a href="./terms.html"><span data-i18n="terms">Terms</span><svg class="footer-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 7h10v10"/><path d="M7 17 17 7"/></svg></a>
          <a href="./cookie-policy.html"><span data-i18n="cookiePolicy">Cookie policy</span><svg class="footer-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 7h10v10"/><path d="M7 17 17 7"/></svg></a>
        </nav>
        <p class="footer-copy" data-i18n="rights">&copy; 2026 Anteon. All rights reserved.</p>
        <div class="footer-prefs">
          <div class="theme-switch" role="radiogroup" aria-label="Theme" data-i18n-attr="aria-label:theme">
            <button class="theme-opt is-active" type="button" role="radio" aria-checked="true" aria-label="System theme" data-i18n-attr="aria-label:themeSystem"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/></svg></button>
            <button class="theme-opt" type="button" role="radio" aria-checked="false" aria-label="Light theme" data-i18n-attr="aria-label:themeLight"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg></button>
            <button class="theme-opt" type="button" role="radio" aria-checked="false" aria-label="Dark theme" data-i18n-attr="aria-label:themeDark"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg></button>
          </div>
          <details class="lang">
            <summary class="lang-toggle" aria-label="Change language" data-i18n-attr="aria-label:ariaChangeLanguage">
              <svg class="lang-globe" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
              <span class="lang-label">English</span>
              <svg class="lang-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
            </summary>
            <ul class="lang-menu">
              <li><button class="lang-opt" type="button" data-lang="en" aria-current="true">English</button></li>
              <li><button class="lang-opt" type="button" data-lang="es">Espa&ntilde;ol</button></li>
            </ul>
          </details>
        </div>
      </div>
`;

/** Anchors that can carry the current-page mark: the header's top-level nav
 * links and the footer's column links. The mega cards and the brand links
 * stay unmarked, exactly as every page rendered before the mount. */
const CURRENT_SCOPE = '.header-nav > a, .footer-col a';

/** ./about.html and the deployed clean URL /about name the same page; the
 * bare / and /index.html both name the landing. */
function pageKey(pathname: string): string {
  const last = pathname.split('/').pop() ?? '';
  const name = last.replace(/\.html$/, '');
  return name === '' || name === 'index' ? 'index' : name;
}

function markCurrent(root: ParentNode): void {
  const here = pageKey(window.location.pathname);
  for (const a of root.querySelectorAll<HTMLAnchorElement>(CURRENT_SCOPE)) {
    const href = a.getAttribute('href');
    if (!href) continue;
    const url = new URL(href, window.location.href);
    // pricing.html#enterprise is a place on a page, not a page of its own.
    if (url.hash) continue;
    if (pageKey(url.pathname) === here) a.setAttribute('aria-current', 'page');
  }
}

/** Fill a mount that is still empty; a filled mount is left alone, so the
 * module is safe to run twice and inert on a page that carries no mounts. */
function fill(el: Element | null, html: string): void {
  if (!el || el.firstElementChild) return;
  el.innerHTML = html;
  markCurrent(el);
}

/* The auth dialog's three views, ported verbatim from the retired signin,
 * signup, and forgot-password pages: same fields, labels, i18n keys,
 * autocomplete attributes, and native validation. Two deliberate deltas:
 * the page h1s become labelled h2s (a dialog sits inside a page that
 * already has its h1), and the cross-links between the screens become
 * view-switch buttons, since there is no longer anywhere to navigate. */
const AUTH_HTML = `
      <div class="auth-panel">
        <button type="button" class="auth-close" aria-label="Close" data-i18n-attr="aria-label:ariaClose"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>
        <section class="auth" data-auth-view="signin">
          <h2 id="auth-title-signin" data-i18n="signinTitle">Sign in</h2>
          <p class="auth-subtitle" data-i18n="signinSubtitle">Welcome back. Sign in to pick up where you left off.</p>
          <form class="auth-form">
            <div class="field">
              <label for="signin-email" data-i18n="authEmailLabel">Email</label>
              <input id="signin-email" name="email" type="email" autocomplete="email" required autofocus />
            </div>
            <div class="field">
              <label for="signin-password" data-i18n="authPasswordLabel">Password</label>
              <input id="signin-password" name="password" type="password" autocomplete="current-password" required />
            </div>
            <div class="auth-row">
              <label class="auth-remember" for="signin-remember">
                <input id="signin-remember" name="remember" type="checkbox" />
                <span class="ar-box" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></span>
                <span data-i18n="rememberMe">Remember me</span>
              </label>
              <button type="button" class="auth-inline-link" data-auth-view-link="forgot" data-i18n="signinForgot">Forgot your password?</button>
            </div>
            <button type="submit" class="auth-submit">
              <span class="as-label" data-i18n="signinSubmit">Sign in</span>
              <span class="as-arrow" aria-hidden="true"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 7h10v10"/><path d="M7 17 17 7"/></svg></span>
            </button>
          </form>
          <p class="auth-alt">
            <span data-i18n="signinNoAccount">New here?</span>
            <button type="button" class="auth-inline-link" data-auth-view-link="signup" data-i18n="signinNoAccountLink">Create an account</button>
          </p>
        </section>
        <section class="auth" data-auth-view="signup">
          <h2 id="auth-title-signup" data-i18n="signupTitle">Create your account</h2>
          <p class="auth-subtitle" data-i18n="signupSubtitle">Start with 1,000+ deterministic engines and a library that grows with your firm.</p>
          <form class="auth-form">
            <div class="field">
              <label for="signup-email" data-i18n="authEmailLabel">Email</label>
              <input id="signup-email" name="email" type="email" autocomplete="email" required />
            </div>
            <div class="field">
              <label for="signup-password" data-i18n="authPasswordLabel">Password</label>
              <input id="signup-password" name="password" type="password" autocomplete="new-password" required minlength="8" />
            </div>
            <button type="submit" class="auth-submit">
              <span class="as-label" data-i18n="signupSubmit">Create account</span>
              <span class="as-arrow" aria-hidden="true"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 7h10v10"/><path d="M7 17 17 7"/></svg></span>
            </button>
          </form>
          <p class="auth-alt">
            <span data-i18n="signupHaveAccount">Already have an account?</span>
            <button type="button" class="auth-inline-link" data-auth-view-link="signin" data-i18n="signupHaveAccountLink">Sign in</button>
          </p>
        </section>
        <section class="auth" data-auth-view="forgot">
          <h2 id="auth-title-forgot" data-i18n="forgotTitle">Reset your password</h2>
          <p class="auth-subtitle" data-i18n="forgotSubtitle">Enter your email and we&rsquo;ll send a link to set a new password.</p>
          <form class="auth-form">
            <div class="field">
              <label for="forgot-email" data-i18n="authEmailLabel">Email</label>
              <input id="forgot-email" name="email" type="email" autocomplete="email" required />
            </div>
            <button type="submit" class="auth-submit">
              <span class="as-label" data-i18n="forgotSubmit">Send reset link</span>
              <span class="as-arrow" aria-hidden="true"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 7h10v10"/><path d="M7 17 17 7"/></svg></span>
            </button>
          </form>
          <p class="auth-alt">
            <button type="button" class="auth-inline-link" data-auth-view-link="signin" data-i18n="forgotBackToSignin">Back to sign in</button>
          </p>
        </section>
      </div>
`;

/** One dialog for the whole auth flow, opened by any [data-auth="open"]
 * control. Native showModal carries the focus trap, Escape, and the top
 * layer; this wiring adds the view switches, the backdrop and close-button
 * dismissals, the scroll lock (a body class for native scroll, auth-open
 * and auth-close events for the landing's Lenis), and the focus contract:
 * first field on open, back to the opening control on close. */
function mountAuthDialog(): void {
  if (document.querySelector('.auth-modal')) return;
  const dialog = document.createElement('dialog');
  dialog.className = 'auth-modal';
  dialog.innerHTML = AUTH_HTML;
  document.body.appendChild(dialog);

  let trigger: HTMLElement | null = null;

  /** Show one view; the other two collapse via CSS. Focus moves only while
   * the dialog is open, so the pre-open reset never steals the page focus. */
  const showView = (view: string): void => {
    dialog.dataset.authView = view;
    dialog.setAttribute('aria-labelledby', 'auth-title-' + view);
    if (dialog.open) {
      dialog.querySelector<HTMLInputElement>(`.auth[data-auth-view="${view}"] input`)?.focus();
    }
  };
  showView('signin');

  // Remember me starts unchecked; checking it is the user's action, and
  // the choice, either way, is remembered in the anteon key family. State
  // only, nothing else reads it yet.
  const remember = dialog.querySelector<HTMLInputElement>('#signin-remember');
  const syncRemember = (): void => {
    if (!remember) return;
    try {
      remember.checked = localStorage.getItem('anteon-remember') === 'on';
    } catch {
      // No storage; the default unchecked state stands.
    }
  };
  remember?.addEventListener('change', () => {
    try {
      localStorage.setItem('anteon-remember', remember.checked ? 'on' : 'off');
    } catch {
      // Persistence is best-effort; the choice holds for this page.
    }
  });
  syncRemember();

  const open = (from: HTMLElement): void => {
    trigger = from;
    // Reopening always starts clean: sign-in view, every field empty. The
    // reset restores the checkbox's unchecked default, so the stored
    // remember choice is re-applied after it.
    for (const f of dialog.querySelectorAll<HTMLFormElement>('form')) f.reset();
    syncRemember();
    showView('signin');
    document.body.classList.add('auth-open');
    window.dispatchEvent(new CustomEvent('auth-open'));
    dialog.showModal();
    dialog.querySelector<HTMLInputElement>('.auth[data-auth-view="signin"] input')?.focus();
  };

  // Escape and the close paths below all funnel through the close event,
  // so the scroll lock and the focus return can never be skipped.
  dialog.addEventListener('close', () => {
    document.body.classList.remove('auth-open');
    window.dispatchEvent(new CustomEvent('auth-close'));
    trigger?.focus();
    trigger = null;
  });

  // The panel covers the dialog's whole box, so a click whose target is the
  // dialog itself landed on the backdrop.
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close();
  });

  dialog.querySelector('.auth-close')?.addEventListener('click', () => dialog.close());

  for (const b of dialog.querySelectorAll<HTMLElement>('[data-auth-view-link]')) {
    b.addEventListener('click', () => showView(b.dataset.authViewLink ?? 'signin'));
  }

  // No auth backend is wired yet, so each form validates its fields with
  // the browser's own constraints and posts nowhere: a valid submit is
  // prevented rather than faking a signed-in state. When an endpoint
  // exists, swap the preventDefault for a real request and report its
  // result here.
  for (const f of dialog.querySelectorAll<HTMLFormElement>('form')) {
    f.addEventListener('submit', (e) => e.preventDefault());
  }

  for (const t of document.querySelectorAll<HTMLElement>('[data-auth="open"]')) {
    t.addEventListener('click', () => open(t));
  }
}

fill(document.getElementById('site-header'), HEADER_HTML);
fill(document.querySelector('footer.site-footer'), FOOTER_HTML);
mountAuthDialog();
