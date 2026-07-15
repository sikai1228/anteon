/**
 * The post chain. Renders the scene over a flat chalkboard clear, blooms the
 * bright chalk gently, then a final pass paints the board texture into the
 * empty areas (low-frequency cloud plus a few faint eraser ghosts), adds
 * animated grain and a soft vignette, and encodes to sRGB for display.
 *
 * The board base color comes from the RenderPass clear, so the composite has
 * a solid image to work on and the bloom pass is not fighting transparency.
 * The final pass only adds the board's texture where there is no chalk, which
 * keeps the strokes themselves clean. Under the vinci look (LOOK.ground
 * 'parchment') the same pass paints aged parchment instead: warm stains, a
 * faint thread weave, browned edges, masked off the ink the same way.
 */

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import type { LookParams, PostApi, Viewport } from '../lib/types';

const COMPOSITE_VERTEX = /* glsl */ `
varying vec2 vUv;
void main(){
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const COMPOSITE_FRAGMENT = /* glsl */ `
precision highp float;

uniform sampler2D tDiffuse;
uniform vec2 uResolution;
uniform float uTime;
uniform float uGrain;
uniform float uGrainHz;
uniform float uVignette;
uniform float uInkMode;

varying vec2 vUv;

float h21(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }

float vnoise2(vec2 x){
  vec2 i = floor(x);
  vec2 f = fract(x);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = h21(i);
  float b = h21(i + vec2(1.0, 0.0));
  float c = h21(i + vec2(0.0, 1.0));
  float d = h21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p){
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 3; i++){
    v += a * vnoise2(p);
    p *= 2.0;
    a *= 0.5;
  }
  return v;
}

// An elongated soft streak, the mark a board eraser leaves behind.
float ghost(vec2 uv, vec2 c, vec2 s, float ang){
  vec2 d = uv - c;
  float ca = cos(ang);
  float sa = sin(ang);
  vec2 r = vec2(d.x * ca - d.y * sa, d.x * sa + d.y * ca);
  return exp(-(r.x * r.x / (s.x * s.x) + r.y * r.y / (s.y * s.y)));
}

float srgbChannel(float c){
  return c < 0.0031308 ? c * 12.92 : 1.055 * pow(c, 1.0 / 2.4) - 0.055;
}

void main(){
  vec3 scene = texture2D(tDiffuse, vUv).rgb;
  float luma = dot(scene, vec3(0.299, 0.587, 0.114));

  float aspect = uResolution.x / max(uResolution.y, 1.0);
  vec2 p = vec2(vUv.x * aspect, vUv.y);

  // The chain already carries display-ready values (measured against the
  // board hex on screen), so no encode here; adding one lifts the near black
  // board to mid gray. Board texture, grain, and vignette are display-space
  // amounts on top.
  vec3 col = clamp(scene, 0.0, 1.0);

  if (uInkMode < 0.5) {
    // Slate board: faint cloud and eraser ghosts, added only off the chalk.
    float chalkMask = smoothstep(0.10, 0.30, luma);
    float cloud = fbm(p * 2.5) - 0.5;
    float ghosts =
        ghost(vUv, vec2(0.32, 0.62), vec2(0.30, 0.05), 0.25) * 0.9 +
        ghost(vUv, vec2(0.70, 0.40), vec2(0.24, 0.045), -0.35) * 0.7 +
        ghost(vUv, vec2(0.50, 0.20), vec2(0.34, 0.04), 0.08) * 0.6;
    float boardVar = cloud * 0.012 + ghosts * 0.02;
    col += boardVar * (1.0 - chalkMask);
  } else {
    // Aged parchment: the bare-paper mask keeps the ink clean while
    // low-frequency stains and browned edges pull the sheet warm (blue
    // falls fastest), and a faint thread weave gives it fiber.
    float bare = smoothstep(0.35, 0.70, luma);
    float blotch = clamp(fbm(p * 1.6 + 19.3) * 0.9 + fbm(p * 5.1 + 47.7) * 0.45 - 0.5, 0.0, 1.0);
    vec3 stain = vec3(1.0) - blotch * vec3(0.07, 0.11, 0.20);
    vec2 dv = vUv - 0.5;
    float rim = smoothstep(0.08, 0.50, dot(dv, dv));
    vec3 edgeTint = vec3(1.0) - rim * vec3(0.07, 0.12, 0.22);
    col *= mix(vec3(1.0), stain * edgeTint, bare);
    float thread =
        (vnoise2(vec2(p.x * 22.0, p.y * 170.0)) - 0.5) +
        (vnoise2(vec2(p.x * 180.0, p.y * 16.0)) - 0.5) * 0.6;
    col += thread * 0.016 * bare;
  }

  float g = h21(vUv * uResolution + floor(uTime * uGrainHz) * 7.13);
  col += (g - 0.5) * uGrain;

  vec2 d = vUv - 0.5;
  col *= 1.0 - uVignette * dot(d, d) * 2.2;

  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;

export function createPost(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  look: LookParams,
): PostApi {
  const size = new THREE.Vector2();
  renderer.getSize(size);
  const dpr = renderer.getPixelRatio();

  const composer = new EffectComposer(renderer);
  composer.setPixelRatio(dpr);
  composer.setSize(size.x, size.y);

  const renderPass = new RenderPass(scene, camera, undefined, new THREE.Color(look.board), 1.0);

  // Run bloom at a quarter of the framebuffer pixel count (half the framebuffer
  // per axis). The glow is faint, so the lower resolution does not visibly
  // change it, and it roughly quarters the bloom's fill cost on the heavy beats.
  const bloomW = Math.max(1, Math.round((size.x * dpr) / 2));
  const bloomH = Math.max(1, Math.round((size.y * dpr) / 2));
  // A strength near zero still pays the full blur chain, so a look with
  // bloom off (the ink prototype) skips the pass entirely.
  const bloom =
    look.bloomStrength > 0.001
      ? new UnrealBloomPass(
          new THREE.Vector2(bloomW, bloomH),
          look.bloomStrength,
          look.bloomRadius,
          look.bloomThreshold,
        )
      : null;

  const finalPass = new ShaderPass({
    uniforms: {
      tDiffuse: { value: null },
      uResolution: { value: new THREE.Vector2(size.x * dpr, size.y * dpr) },
      uTime: { value: 0 },
      uGrain: { value: look.grain },
      uGrainHz: { value: look.grainHz },
      uVignette: { value: look.vignette },
      uInkMode: { value: look.ground === 'parchment' ? 1 : 0 },
    },
    vertexShader: COMPOSITE_VERTEX,
    fragmentShader: COMPOSITE_FRAGMENT,
  });

  composer.addPass(renderPass);
  if (bloom) composer.addPass(bloom);
  composer.addPass(finalPass);

  return {
    render(timeSec: number): void {
      finalPass.uniforms.uTime.value = timeSec;
      composer.render();
    },
    resize(v: Viewport): void {
      composer.setPixelRatio(v.dpr);
      composer.setSize(v.w, v.h);
      // composer.setSize just resized bloom to the full framebuffer; put it back
      // to quarter resolution (half per axis).
      if (bloom) {
        bloom.setSize(
          Math.max(1, Math.round((v.w * v.dpr) / 2)),
          Math.max(1, Math.round((v.h * v.dpr) / 2)),
        );
      }
      finalPass.uniforms.uResolution.value.set(v.w * v.dpr, v.h * v.dpr);
    },
    dispose(): void {
      if (bloom) bloom.dispose();
      finalPass.dispose();
      composer.dispose();
    },
  };
}
