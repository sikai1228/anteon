# Anteon site

The Anteon marketing site, plus the scroll-driven intro film that opens the
landing page. Chalk on black, one continuous take, scroll is the clock: Newton
to the Wright brothers to the Moon, ending on the reason the company exists.
Static HTML pages and TypeScript modules built by Vite. No framework, no
server.

## Run

```
pnpm install
pnpm dev        # http://localhost:5178
pnpm build      # typecheck, then a production build into dist
pnpm preview    # serve the built site
```

## Pages

`index.html` opens on the film and settles onto the landing page. Every other
page is a shell that mounts the same header and footer from
`src/lib/site-chrome.ts`, so the chrome is the same bytes everywhere.

- Product: `engine.html`, `api.html`, `personal.html`, `api-key.html`
- Sales: `pricing.html`, `enterprise.html`
- Company: `about.html`, `blog.html`, `contact.html`, `support.html`,
  `docs.html`
- Legal: `privacy.html`, `terms.html`, `cookie-policy.html`

Every page is registered as a Rollup input in `vite.config.ts`. A new page
needs a line there or the build skips it.

## Layout

```
index.html          the quote, the film, and the landing page
src/main.ts         the film runtime
src/page.ts         chrome, language, and theme for the shell pages
src/film.config.ts  beats and camera keys; the storyboard is data
src/copy.ts         every on-screen string in the film
src/i18n/           English and Spanish catalogs, plus detection
src/lib/            timeline, captions, strokes, globe, demo, debug
src/look/           chalk material, post stack, hatching
src/scenes/         01-newton, 02-flyer, 03-boot, 04-moon, arc
src/tokens.css      the palette and type scale, light and dark
public/             fonts, logos, and page imagery
SPEC.md             the working agreement between the film's modules
CREDITS.md          whose shoulders this stands on
```

## Working on it

- To retime a beat, edit `src/film.config.ts`.
- Film copy lives in `src/copy.ts`. Nothing else in the film holds strings.
- Site copy lives in `src/i18n/catalogs.ts`, which carries both languages.
- The look block in `src/lib/types.ts` tunes the whole aesthetic from one
  place.
- To scrub the film, open `http://localhost:5178/?debug` for a scrub bar, or
  deep link any moment with `?t=0.42`.

Language (English or Spanish) and theme (light, dark, or system) follow the
browser on a first visit, then persist in local storage.

## Status

The site chrome, the page set, the chalk stroke system, the film runtime, and
the Newton scene are real. The Flyer, boot, and Moon scenes are rough
placeholders waiting on the Smithsonian and NASA scans staged in
`public/assets/ASSETS.md`. Reduced motion or a browser without WebGL2 gets the
film's copy as stacked cards instead.

## Deploying

Vercel, with clean URLs on, so `/pricing` serves `pricing.html`.
