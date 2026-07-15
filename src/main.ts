/**
 * Boot. Reduced motion or a failed WebGL2 probe drops to a static caption
 * stack and never touches three. Otherwise the film runs: one renderer, one
 * camera, scenes mounted lazily by scroll range, the post stack on top. The
 * render loop pauses when the tab is hidden and stops once the film is behind
 * the viewer, re-armed by an intersection observer.
 */

import 'lenis/dist/lenis.css';
import * as THREE from 'three';
import { FILM } from './film.config';
import { LOOK, LOOK_NAME } from './lib/types';
import type { FilmContext, FilmScene, SceneDef, Viewport } from './lib/types';
import { createTimeline, sampleCamera } from './lib/timeline';
import { createCaptions } from './lib/captions';
import { initI18n } from './i18n/i18n';
import { mountDebug } from './lib/debug';
import { createStrokeSet } from './lib/strokes';
import { createPost } from './look/post';
import { SCENES } from './scenes';

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

function hasWebGL2(): boolean {
  try {
    return !!document.createElement('canvas').getContext('webgl2');
  } catch {
    return false;
  }
}

function boot(): void {
  // Tag the shell with any non-default look so tokens.css can restyle the
  // stage, quote, captions, and controls to match the render.
  if (LOOK_NAME !== 'chalk') document.documentElement.dataset.look = LOOK_NAME;
  // Localize before anything reads copy: the caption engine builds its text
  // from the active locale at construction, and the static stack does the same.
  initI18n();
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const captions = createCaptions();

  if (reduced || !hasWebGL2()) {
    document.documentElement.classList.add('static');
    // Drop the inline film height so `html.static #film { height: auto }` wins;
    // an id inline style would otherwise outrank the stylesheet and leave a tall
    // dead scroll under the stacked captions.
    const filmEl = document.getElementById('film');
    if (filmEl) filmEl.style.height = '';
    captions.buildStatic();
    return;
  }

  runFilm(captions);
}

function runFilm(captions: ReturnType<typeof createCaptions>): void {
  const filmEl = document.getElementById('film') as HTMLElement;
  filmEl.style.height = FILM.scrollLengthVh + 'vh';

  const canvas = document.getElementById('gl') as HTMLCanvasElement;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true });
  const vp: Viewport = {
    w: window.innerWidth,
    h: window.innerHeight,
    dpr: Math.min(window.devicePixelRatio || 1, LOOK.dprCap),
  };
  renderer.setPixelRatio(vp.dpr);
  renderer.setSize(vp.w, vp.h, false);
  renderer.setClearColor(new THREE.Color(LOOK.board), 1);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(LOOK.fov, vp.w / vp.h, 0.1, 4000);

  let nowSec = 0;
  const ctx: FilmContext = {
    three: { scene, camera, renderer },
    look: LOOK,
    time: () => nowSec,
    viewport: () => vp,
    makeStrokeSet: (opts) =>
      createStrokeSet({ style: opts?.style, maxPoints: opts?.maxPoints, look: LOOK }),
  };

  const post = createPost(renderer, scene, camera, LOOK);
  const timeline = createTimeline(filmEl);

  // The chrome dispatches film-jump for hard cuts (the wordmark going home);
  // answering with the immediate Lenis jump prevents any backward glide.
  window.addEventListener('film-jump', (ev) => {
    timeline.scrollToP((ev as CustomEvent<number>).detail ?? 0);
  });

  // Place the camera at its opening pose before the first scene update, which
  // the frame runs ahead of sampleCamera.
  sampleCamera(timeline.progress(), camera);

  interface Entry {
    scene: FilmScene;
    range: [number, number];
    mounted: boolean;
    visible: boolean;
  }
  const entries: Entry[] = FILM.scenes.map((def: SceneDef) => {
    const sc = SCENES.find((s) => s.id === def.id);
    if (!sc) throw new Error('no scene registered for ' + def.id);
    sc.setVisible(false);
    return { scene: sc, range: def.range, mounted: false, visible: false };
  });

  if (new URLSearchParams(window.location.search).has('debug')) {
    mountDebug(
      () => timeline.progress(),
      (p) => timeline.scrollToP(p),
    );
  }

  /** Mount a scene this far ahead of its range so first entry is warm. */
  const MARGIN = 0.03;

  function onResize(): void {
    vp.w = window.innerWidth;
    vp.h = window.innerHeight;
    vp.dpr = Math.min(window.devicePixelRatio || 1, LOOK.dprCap);
    renderer.setPixelRatio(vp.dpr);
    renderer.setSize(vp.w, vp.h, false);
    camera.aspect = vp.w / vp.h;
    camera.updateProjectionMatrix();
    post.resize(vp);
  }
  window.addEventListener('resize', onResize);

  const startMs = performance.now();
  let lastMs = startMs;
  let running = false;
  let filmInView = true;

  function frame(now: number): void {
    if (document.hidden) {
      // Nothing scrolls while hidden; pause the one loop until the tab returns.
      running = false;
      return;
    }
    // One loop: advance Lenis first so scroll and render share this frame's
    // clock, then keep the loop alive regardless of the render gate below.
    timeline.tick(now);
    requestAnimationFrame(frame);

    const dt = (now - lastMs) / 1000;
    lastMs = now;
    nowSec = (now - startMs) / 1000;

    const raw = timeline.progress();
    const sm = timeline.smoothed(dt);

    // Once the film is scrolled fully past and behind the viewer, keep ticking
    // Lenis so scroll stays alive but skip the scene and render work.
    if (!filmInView && raw >= 0.999) return;

    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      const inA = e.range[0];
      const inB = e.range[1];
      const inRange = sm >= inA && sm <= inB;
      if (!e.mounted && sm >= inA - MARGIN && sm <= inB + MARGIN) {
        e.scene.mount(ctx);
        e.mounted = true;
      }
      if (inRange !== e.visible) {
        e.scene.setVisible(inRange);
        e.visible = inRange;
      }
      if (inRange && e.mounted) {
        const span = inB - inA;
        const local = span > 0 ? clamp01((sm - inA) / span) : 0;
        e.scene.update(local, sm, ctx);
      }
    }

    sampleCamera(sm, camera);
    captions.update(raw);
    post.render(nowSec);
  }

  function start(): void {
    if (running || document.hidden) return;
    running = true;
    lastMs = performance.now();
    requestAnimationFrame(frame);
  }

  const io = new IntersectionObserver(
    (ents) => {
      filmInView = ents[0]?.isIntersecting ?? false;
      if (filmInView) start();
    },
    { threshold: 0 },
  );
  io.observe(filmEl);

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) start();
  });

  // Warm every scene and the shader pipeline during idle time so the first
  // approach to each scene does not hitch. Already-mounted scenes are left
  // alone; newly mounted ones stay invisible, so the warm pass draws only the
  // board when nothing is on screen. The lazy-mount path in frame() then no-ops.
  function preMount(): void {
    for (const e of entries) {
      if (e.mounted) continue;
      e.scene.mount(ctx);
      e.mounted = true;
      e.scene.setVisible(false);
      e.visible = false;
    }
    renderer.compile(scene, camera);
    post.render(0);
  }
  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(() => preMount());
  } else {
    window.setTimeout(preMount, 200);
  }

  start();
}

boot();
