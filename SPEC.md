# Layer2 intro: build spec

Scroll-driven intro film. Chalk on black, one continuous take, scroll is the
clock. This file is the working agreement between modules. The contracts in
`src/lib/types.ts` are law; `src/film.config.ts` and `src/copy.ts` are data.

## Architecture rules

1. Every visual is a pure function of scroll progress `p` in [0..1]. The one
   exception is the boil (time-based jitter), which is cosmetic. No scene may
   keep internal animation state; `update(local, global, ctx)` must be
   idempotent for the same inputs. This is what makes scrubbing, deep links,
   and screenshot regression possible.
2. `film.config.ts` and `types.ts` are read-only for implementation agents.
   If a contract or a camera key blocks you, adapt inside your files and
   report the exact change you want in your final summary.
3. No new dependencies. three, lenis, vite, typescript only. GLSL lives in
   template literals inside .ts files.
4. No textures, no image assets this round. All noise is procedural in shader.
5. Comments and any user-facing strings: sentence case, no em dashes, no
   exclamation points, no all-caps.

## Ownership

| Owner | Files |
|---|---|
| render-core | `src/lib/strokes.ts`, `src/look/chalkStroke.ts`, `src/look/post.ts`, `src/look/hatch.ts` |
| film-runtime | `src/main.ts`, `src/lib/timeline.ts`, `src/lib/captions.ts`, `src/lib/debug.ts` |
| scene-newton | `src/scenes/01-newton.ts` |
| scenes-rough | `src/scenes/02-flyer.ts`, `src/scenes/03-boot.ts`, `src/scenes/04-moon.ts` |

Contract files already written: `types.ts`, `film.config.ts`, `copy.ts`,
`scenes/arc.ts`, `scenes/index.ts`, `index.html`, `styles.css`.

## The chalk look (render-core)

Strokes, not surfaces. One `StrokeSet` = one merged geometry = one draw call
for the chalk pass, plus one for the dust pass.

Geometry: screen-space expanded polylines. Per point emit two vertices with
attributes: `aCurr`, `aPrev`, `aNext` (world positions), `aSide` (+1/-1),
`aU` (arc length 0..1 in the stroke), `aStrokeSeed`, `aWidthMul`, `aColor`,
`aDrawWindow` (vec2, set-draw space). Vertex shader projects curr/prev/next,
computes the screen-space miter or bevel direction, and offsets by
`widthPx * dpr * aSide * taper(aU)` in clip space using the viewport size
uniform.

Draw-on: uniform `uDraw` 0..1. Fragment (or vertex) discards where
`aU > smoothstep(aDrawWindow.x, aDrawWindow.y, uDraw)` remapped so each
stroke draws front to back inside its window. Default windows: staggered by
insertion order with about 0.6 overlap so strokes cascade.

Boil: vertex offset in screen px. `hash(aStrokeSeed, pointIndex, floor(uTime *
boilHz))`, value-noise smoothed, amplitude `boilAmpPct * viewport.h` px.
Quantized time is the point: the drawing re-registers 8 times a second, it
does not swim continuously.

Fragment chalk: alpha = edgeProfile(aSide, 1 px feather) * pressure(aU, seed)
(taper at both ends plus low-frequency variation along the stroke) * tooth.
Tooth = two-octave value noise sampled at `gl_FragCoord.xy / toothPx`,
contrast-shaped by `toothContrast`. The grain lives in screen space on
purpose: it belongs to the board, not the line. Then dithered discard
(4x4 bayer or hash threshold) so edges break like chalk instead of feathering.
Color: `uColor` with a few percent of per-fragment value jitter. Blending
normal, `depthWrite: false`, `depthTest: false`; scenes control renderOrder.

Dust pass: same geometry, width times `dustWidthMul`, alpha `dustAlpha`, no
discard, soft edge, rendered under the chalk pass. This is the chalk dust
bleed and the film's only glow apart from bloom.

`colorBypass` strokes (the flag only) skip nothing structurally, they just
use flagRed/flagBlue as `uColor`. Single-value discipline is enforced by
every other material using chalkWhite.

Post (`createPost(renderer, scene, camera, look): PostApi`): EffectComposer
from three/addons. RenderPass over transparent black, UnrealBloomPass at the
LOOK settings, then a final ShaderPass that composites: board under scene
color, then grain, then vignette. Board = LOOK.board plus about 0.012 of
low-frequency cloud noise plus two or three faint elongated smudge streaks
(stretched noise), the eraser ghosts. Grain: hash noise, animated at
`grainHz`, amplitude `grain`. Vignette at LOOK.vignette, gentle.

Hatch (`hatch.ts`): CPU helpers returning `THREE.Vector3[][]` polylines.
`hatchDisk(center, radius, angleRad, spacing, seed)` and
`hatchQuad(corner, uDir, vDir, angleRad, spacing, seed)`, both with slight
per-line wobble and jittered endpoints. Scenes feed the result to StrokeSets.

## The runtime (film-runtime)

`timeline.ts`: Lenis on the document (respect prefers-reduced-motion by not
constructing it). `progress()` returns raw p from scroll over
`#film`'s height minus viewport; also expose `smoothed()` with a frame-rate
independent exponential lerp (about k = 10/s). `sampleCamera(p, camera)`
interpolates FILM.camera keys (smoothstep between brackets), applies pos,
target, fov, and roll (rotate the up vector around the view axis). Deep link
`?t=0.42` scrolls there on load; `?debug` mounts debug.ts.

`captions.ts`: build caption elements from FILM.captions plus COPY (skip
`enabled: false`). Each frame set opacity from p: cubic ease inside the first
and last 18 percent of each beat's window, plus a small upward drift on exit
for the quote (`el: 'quote'` binds the existing element instead of creating
one). Cards get `.card`, small gets `.small`. Fades: drive `#fade` background
and opacity from FILM.fades and LOOK colors per the FadeBeat semantics in
types.ts. Static mode (reduced motion or no WebGL2): add `.static` to <html>,
skip GL entirely, build all captions stacked in order; styles.css already
handles the layout.

`main.ts` boot order: check reduced motion and WebGL2 (canvas context probe);
static path bails before touching three. Otherwise: renderer (antialias
false, alpha true), clear color LOOK.board alpha 1, DPR = min(devicePixelRatio,
dprCap). Build FilmContext with `makeStrokeSet` wired to
`createStrokeSet({ ...opts, look: LOOK })`. Set `#film` height from
FILM.scrollLengthVh. Mount scenes lazily on first entry to their range plus a
0.03 margin; `setVisible` by range each frame; call `update` with local
progress clamped 0..1. Per frame: `strokeSet.update` happens inside scenes'
own update via ctx time and viewport, so the runtime only calls scene.update,
then post.render(time). requestAnimationFrame pauses when `document.hidden`
and stops entirely once p has passed 1 and `#film` has left the viewport
(IntersectionObserver re-arms it). Resize: renderer, camera aspect,
post.resize.

Render loop must not allocate: reuse vectors, no per-frame closures.

## Scenes

General: build all strokes at mount as StrokeSets, then choreograph
exclusively with `setDraw`, `setOpacity`, group transforms, and camera. A
scene is a drawing being made and unmade, not objects moving in a world,
except where the storyboard says so (the apple falls, the Flyer flies, the
sole presses).

Draw call budget: at most 4 StrokeSets per scene. Frame budget: whole film
under 40 draw calls.

`01-newton` (region x = 0): trunk plus 4 to 5 levels of branches as polylines
from a small recursive generator (seeded, deterministic; tune constants at the
top of the file). Growth 0.05 to 0.18 local-remapped: root draws first, tips
last, via draw windows in insertion order. Canopy: hatchDisk clusters
thickening 0.14 to 0.20. Apple at FILM.arc.start: a small circle of 3 to 4
strokes plus a stem, drawing in 0.18 to 0.22 while nearby canopy hatch
densifies, so it resolves out of the hatching. Drop 0.22 to 0.26 along
`arcPoint(s)` with ease-in, slight tumble, and a two-frame squash at impact
(pure function of local, no state). Figure: seated silhouette from behind at
[3.4, 0, 0], authored polyline coordinates, then a standing pose; the seated
set un-draws (setDraw decreasing) while the standing set draws across 0.26 to
0.30. Ground: one long horizon stroke plus grass ticks.

`02-flyer` (region x = 60): procedural 1903 Flyer reading as chalk: two long
wing outlines with about 14 short rib strokes each, struts, crossed bracing
wires, front canard, twin pushers as ellipses, skids. Placeholder fidelity is
fine; a Smithsonian scan replaces this via an outline pass in a later round.
Takeoff along `arcFlyerPoint(s)` for local 0.1 to 0.9, banking (group roll)
after 0.6 so the wing turns edge-on by local 1.0, matching the camera key at
t 0.465 where ribs fill the frame. Draw-on happens fast in local 0.0 to 0.15.

`03-boot` (region x = 180, shared ground with moon): A7L-style sole. About 12
parallel tread ridge strokes framed to match the rib framing at t 0.475 (the
cut), sole outline, heel. Press down local 0.1 to 0.35 (group y), dust ticks
burst at contact, then as the camera pulls back the print remains: a flat
copy of the tread pattern lying on the ground plane (rotated onto it, slight
regolith displacement ticks around it). The sole set fades as the print set
draws.

`04-moon` (region x = 180): terrain: long horizon stroke, 8 to 12 crater
ellipses at grazing angles, rock ticks, all sparse. Distant suited figure at
about [186, 0, -6], tiny authored polyline silhouette. Flag at [183, 0, 0]:
pole stroke, then the cloth as 7 red stripe strokes plus a blue canton block
of short hatch strokes, `colorBypass: true`, colors from LOOK. It rises
(draw-on upward plus a lift of the cloth group) around global 0.68. Wave
comes free from wobble and boil. After 0.78 the camera pushes in and the DOM
fade takes over; keep the cloth strokes widening slightly (widthMul via a
second StrokeSet swap is not worth it; just let the framing do the work).

## Asset rounds (later, not this round)

User-sourced scans replace placeholders: Smithsonian 1903 Wright Flyer
(public domain, Sketchfab), NASA 3D resources for the boot, A7L figure, and
flag assembly. Entry path: meshopt-compressed GLB into `public/assets/`,
rendered chalk-style via a depth plus normal edge pass (webgl-outlines
approach) layered with authored stroke sets. Every shipped third-party model
gets a line in CREDITS.md and on credits.html. Check each NASA file's terms
individually before shipping it.

## Definition of done, all agents

- `pnpm typecheck` clean for your files.
- No TODO placeholders on the main path; rough is fine, dead is not.
- Do not run the dev server, do not commit, do not touch files you do not own.
- Final report: files written, decisions that deviate from this spec, exact
  contract or camera-key changes you want, plus anything the integrator must
  know. Keep it under 30 lines.
