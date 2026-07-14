# Layer2 intro: shoulders of giants

A scroll-driven intro film. Chalk on black, one camera, one continuous take,
scroll is the clock. Newton to the Wright brothers to the Moon, ending on:
your AI shouldn't stand alone.

## Run

```
pnpm install
pnpm dev        # http://localhost:5178
pnpm build      # typecheck plus production build
```

## Working on it

- Retime a beat: edit `src/film.config.ts`. The storyboard is data.
- Change copy: edit `src/copy.ts`. Nothing else contains strings.
- Tune the look: edit `LOOK` in `src/lib/types.ts`, one place for the whole
  aesthetic.
- Scrub: open `http://localhost:5178/?debug` for a scrub bar, or deep link
  any moment with `?t=0.42`.

## Layout

```
index.html          quote as plain HTML, first paint, no JS needed
src/film.config.ts  beats, camera keys, the shared arc
src/copy.ts         every on-screen string
src/lib/types.ts    contracts plus LOOK params
src/lib/            timeline, captions, strokes, debug
src/look/           chalk material, post stack, hatching
src/scenes/         01-newton, 02-flyer, 03-boot, 04-moon, arc
SPEC.md             the working agreement between modules
CREDITS.md          whose shoulders this stands on
```

## Status

- Real: architecture, chalk stroke system, runtime, Newton scene.
- Rough placeholders: Flyer, boot, Moon scenes; swapped for the Smithsonian
  Flyer scan and NASA models in a later round via an outline pass.
- Static fallback: reduced motion or no WebGL2 gets the copy as stacked
  cards.
