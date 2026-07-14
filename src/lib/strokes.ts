/**
 * The one drawing primitive. A StrokeSet is a batch of chalk strokes that
 * share a style and merge into a single BufferGeometry, drawn once for the
 * chalk pass and once for the dust pass off the same geometry. Strokes are
 * added at mount; the set is then driven purely by setDraw, setOpacity, and
 * the group transform, so the whole thing stays a pure function of scroll.
 *
 * Geometry is built lazily and only when the stroke list changed, so no work
 * happens per frame beyond writing a handful of uniforms.
 */

import * as THREE from 'three';
import { createStrokeMaterials } from '../look/chalkStroke';
import type {
  AddStrokeOptions,
  StrokeHandle,
  StrokeSetApi,
  StrokeSetOptions,
  StrokeStyle,
  Viewport,
} from './types';
import { DEFAULT_STROKE_STYLE } from './types';

interface StrokeRecord {
  pts: THREE.Vector3[];
  color: THREE.Color;
  widthMul: number;
  drawWindow: [number, number] | null;
  seed: number;
  boilSeed: number | null;
}

/* Deterministic value noise for the baked wobble, matched to the shader idea. */
function hash11(n: number): number {
  const s = Math.sin(n * 127.1) * 43758.5453123;
  return s - Math.floor(s);
}

function vnoise1(x: number): number {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return hash11(i) * (1 - u) + hash11(i + 1) * u;
}

/**
 * Bake a low-frequency wobble into the interior points so authored lines get
 * a hand-drawn drift. Wobble lives in the board plane (world x and y) and
 * envelopes to zero at the endpoints, which keeps joins between strokes tight.
 */
function bakeWobble(
  src: THREE.Vector3[],
  amp: number,
  freq: number,
  seed: number,
): THREE.Vector3[] {
  const n = src.length;
  const out = src.map((v) => v.clone());
  if (n < 3 || amp <= 0) return out;
  for (let i = 1; i < n - 1; i++) {
    const t = i / (n - 1);
    const env = Math.sin(t * Math.PI);
    out[i].x += (vnoise1(seed + i * freq) - 0.5) * 2 * amp * env;
    out[i].y += (vnoise1(seed + 100 + i * freq) - 0.5) * 2 * amp * env;
  }
  return out;
}

/** Staggered draw window for stroke i of n, about 0.6 overlap between windows. */
function defaultWindow(i: number, n: number): [number, number] {
  if (n <= 1) return [0, 1];
  const w = 1 / (0.4 * n + 0.6);
  const start = 0.4 * w * i;
  return [start, Math.min(1, start + w)];
}

export function createStrokeSet(opts: StrokeSetOptions): StrokeSetApi {
  const look = opts.look;
  const style: StrokeStyle = { ...DEFAULT_STROKE_STYLE, ...opts.style };
  const mats = createStrokeMaterials(look, style);

  const records: StrokeRecord[] = [];
  let dirty = false;
  let geometry = new THREE.BufferGeometry();

  const chalkMesh = new THREE.Mesh(geometry, mats.chalk);
  const dustMesh = new THREE.Mesh(geometry, mats.dust);
  chalkMesh.frustumCulled = false;
  dustMesh.frustumCulled = false;

  const object3d = new THREE.Group();
  if (style.dust) object3d.add(dustMesh);
  object3d.add(chalkMesh);

  function rebuild(): void {
    const renderable = records.filter((r) => r.pts.length >= 2);
    let vertCount = 0;
    let idxCount = 0;
    for (const r of renderable) {
      vertCount += r.pts.length * 2;
      idxCount += (r.pts.length - 1) * 6;
    }

    const aCurr = new Float32Array(vertCount * 3);
    const aPrev = new Float32Array(vertCount * 3);
    const aNext = new Float32Array(vertCount * 3);
    const aColor = new Float32Array(vertCount * 3);
    const aSide = new Float32Array(vertCount);
    const aU = new Float32Array(vertCount);
    const aStrokeSeed = new Float32Array(vertCount);
    const aBoilSeed = new Float32Array(vertCount);
    const aWidthMul = new Float32Array(vertCount);
    const aDrawWindow = new Float32Array(vertCount * 2);
    const index = new Uint32Array(idxCount);

    let vOff = 0;
    let iOff = 0;
    for (let si = 0; si < renderable.length; si++) {
      const r = renderable[si];
      const p = r.pts;
      const count = p.length;
      const win = r.drawWindow ?? defaultWindow(si, renderable.length);
      const cr = r.color.r;
      const cg = r.color.g;
      const cb = r.color.b;
      const boilSeed = r.boilSeed ?? r.seed;

      for (let i = 0; i < count; i++) {
        const cur = p[i];
        const prev = p[i > 0 ? i - 1 : 0];
        const next = p[i < count - 1 ? i + 1 : count - 1];
        const u = count > 1 ? i / (count - 1) : 0;
        for (let side = 0; side < 2; side++) {
          const vi = vOff + i * 2 + side;
          aCurr[vi * 3] = cur.x;
          aCurr[vi * 3 + 1] = cur.y;
          aCurr[vi * 3 + 2] = cur.z;
          aPrev[vi * 3] = prev.x;
          aPrev[vi * 3 + 1] = prev.y;
          aPrev[vi * 3 + 2] = prev.z;
          aNext[vi * 3] = next.x;
          aNext[vi * 3 + 1] = next.y;
          aNext[vi * 3 + 2] = next.z;
          aColor[vi * 3] = cr;
          aColor[vi * 3 + 1] = cg;
          aColor[vi * 3 + 2] = cb;
          aSide[vi] = side === 0 ? -1 : 1;
          aU[vi] = u;
          aStrokeSeed[vi] = r.seed;
          aBoilSeed[vi] = boilSeed;
          aWidthMul[vi] = r.widthMul;
          aDrawWindow[vi * 2] = win[0];
          aDrawWindow[vi * 2 + 1] = win[1];
        }
      }

      for (let i = 0; i < count - 1; i++) {
        const a = vOff + i * 2;
        index[iOff++] = a;
        index[iOff++] = a + 2;
        index[iOff++] = a + 1;
        index[iOff++] = a + 1;
        index[iOff++] = a + 2;
        index[iOff++] = a + 3;
      }
      vOff += count * 2;
    }

    const next = new THREE.BufferGeometry();
    const currAttr = new THREE.BufferAttribute(aCurr, 3);
    next.setAttribute('aCurr', currAttr);
    next.setAttribute('aPrev', new THREE.BufferAttribute(aPrev, 3));
    next.setAttribute('aNext', new THREE.BufferAttribute(aNext, 3));
    next.setAttribute('aColor', new THREE.BufferAttribute(aColor, 3));
    next.setAttribute('aSide', new THREE.BufferAttribute(aSide, 1));
    next.setAttribute('aU', new THREE.BufferAttribute(aU, 1));
    next.setAttribute('aStrokeSeed', new THREE.BufferAttribute(aStrokeSeed, 1));
    next.setAttribute('aBoilSeed', new THREE.BufferAttribute(aBoilSeed, 1));
    next.setAttribute('aWidthMul', new THREE.BufferAttribute(aWidthMul, 1));
    next.setAttribute('aDrawWindow', new THREE.BufferAttribute(aDrawWindow, 2));
    // Alias position to the current point so culling and bounds have real data.
    next.setAttribute('position', currAttr);
    next.setIndex(new THREE.BufferAttribute(index, 1));

    geometry.dispose();
    geometry = next;
    chalkMesh.geometry = next;
    dustMesh.geometry = next;
    dirty = false;
  }

  function ensure(): void {
    if (dirty) rebuild();
  }

  const api: StrokeSetApi = {
    object3d,
    get strokeCount() {
      return records.length;
    },

    addStroke(points: THREE.Vector3[], addOpts?: AddStrokeOptions): StrokeHandle {
      const seed = style.seed + records.length * 1.618;
      const pts = bakeWobble(points, style.wobbleAmp, style.wobbleFreq, seed);
      records.push({
        pts,
        color: new THREE.Color(addOpts?.color ?? style.color),
        widthMul: (addOpts?.widthPx ?? style.widthPx) / style.widthPx,
        drawWindow: addOpts?.drawWindow ?? null,
        seed,
        boilSeed: addOpts?.boilSeed ?? null,
      });
      dirty = true;
      return { index: records.length - 1 };
    },

    setDraw(p: number): void {
      mats.chalk.uniforms.uDraw.value = p;
      mats.dust.uniforms.uDraw.value = p;
    },

    setOpacity(alpha: number): void {
      mats.chalk.uniforms.uOpacity.value = alpha;
      mats.dust.uniforms.uOpacity.value = alpha;
    },

    update(timeSec: number, _camera: THREE.PerspectiveCamera, viewport: Viewport): void {
      ensure();
      const dpr = viewport.dpr;
      const w = viewport.w * dpr;
      const h = viewport.h * dpr;
      mats.chalk.uniforms.uViewport.value.set(w, h);
      mats.chalk.uniforms.uDpr.value = dpr;
      mats.chalk.uniforms.uTime.value = timeSec;
      mats.chalk.uniforms.uLookWidthMul.value = look.widthMul;
      mats.dust.uniforms.uViewport.value.set(w, h);
      mats.dust.uniforms.uDpr.value = dpr;
      mats.dust.uniforms.uTime.value = timeSec;
      mats.dust.uniforms.uLookWidthMul.value = look.widthMul;

      // Keep the dust pass just under the chalk pass, tracking any renderOrder
      // the scene set on the group.
      const ro = object3d.renderOrder;
      dustMesh.renderOrder = ro;
      chalkMesh.renderOrder = ro + 0.001;
    },

    clear(): void {
      records.length = 0;
      dirty = true;
      rebuild();
    },

    dispose(): void {
      geometry.dispose();
      mats.chalk.dispose();
      mats.dust.dispose();
      object3d.clear();
    },
  };

  return api;
}
