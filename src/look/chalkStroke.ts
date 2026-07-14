/**
 * The two ShaderMaterials behind every stroke: the chalk pass and the dust
 * pass. Both share one vertex shader that expands a world-space polyline into
 * a screen-space ribbon, staggers the draw-on, and adds the boil. The chalk
 * fragment builds the chalk edge, pressure, and screen-space tooth with a
 * dithered break-up; the dust fragment is a wide soft halo under it.
 *
 * These materials are internal to lib/strokes. Geometry supplies the
 * attributes aCurr, aPrev, aNext, aSide, aU, aStrokeSeed, aWidthMul, aColor,
 * aDrawWindow. The per-stroke color travels in aColor; uColor stays a neutral
 * white tint so the flag can carry its own colors in one set while every other
 * set keeps a single value in aColor.
 */

import * as THREE from 'three';
import type { LookParams, StrokeStyle } from '../lib/types';

export interface StrokeMaterials {
  chalk: THREE.ShaderMaterial;
  dust: THREE.ShaderMaterial;
}

/* Shared procedural noise, injected into both stages. */
const GLSL_NOISE = /* glsl */ `
float h11(float p){ p = fract(p * 0.1031); p *= p + 33.33; p *= p + p; return fract(p); }
float h21(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vnoise1(float x){ float i = floor(x); float f = fract(x); float u = f * f * (3.0 - 2.0 * f); return mix(h11(i), h11(i + 1.0), u); }
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
`;

const VERTEX = /* glsl */ `
in vec3 aCurr;
in vec3 aPrev;
in vec3 aNext;
in float aSide;
in float aU;
in float aStrokeSeed;
in float aWidthMul;
in vec3 aColor;
in vec2 aDrawWindow;

uniform vec2 uViewport;
uniform float uDpr;
uniform float uDraw;
uniform float uTime;
uniform float uWidthPx;
uniform float uTaper;
uniform float uBoilHz;
uniform float uBoilAmpPct;
uniform float uWidthMulGlobal;

out float vU;
out float vSide;
out vec3 vColor;
out float vSeed;
out float vDrawT;

${GLSL_NOISE}

vec2 clipToScreen(vec4 clip){ return (clip.xy / clip.w * 0.5 + 0.5) * uViewport; }

void main(){
  vec4 mvC = modelViewMatrix * vec4(aCurr, 1.0);
  vec4 clipC = projectionMatrix * mvC;
  vec4 clipP = projectionMatrix * modelViewMatrix * vec4(aPrev, 1.0);
  vec4 clipN = projectionMatrix * modelViewMatrix * vec4(aNext, 1.0);

  vec2 sC = clipToScreen(clipC);
  vec2 sP = clipToScreen(clipP);
  vec2 sN = clipToScreen(clipN);

  bool hasPrev = distance(sC, sP) > 1e-3;
  bool hasNext = distance(sC, sN) > 1e-3;
  vec2 dirB = hasNext ? normalize(sN - sC) : vec2(1.0, 0.0);
  vec2 dirA = hasPrev ? normalize(sC - sP) : dirB;
  if (!hasNext) dirB = dirA;

  vec2 dir = normalize(dirA + dirB);
  vec2 nrm = vec2(-dir.y, dir.x);
  vec2 nA = vec2(-dirA.y, dirA.x);
  float miter = 1.0 / max(dot(nrm, nA), 0.35);

  float tw = clamp(uTaper, 0.001, 0.5);
  float endShape = smoothstep(0.0, tw, aU) * smoothstep(0.0, tw, 1.0 - aU);
  float widthTaper = 0.18 + 0.82 * endShape;
  float halfW = 0.5 * uWidthPx * uDpr * aWidthMul * uWidthMulGlobal * widthTaper * miter;

  // Boil: coherent along the stroke, re-rolled at uBoilHz, never swims.
  float ts = floor(uTime * uBoilHz);
  float bx = vnoise1(aU * 7.0 + h21(vec2(aStrokeSeed, ts)) * 137.0) * 2.0 - 1.0;
  float by = vnoise1(aU * 7.0 + 41.0 + h21(vec2(aStrokeSeed + 19.0, ts)) * 137.0) * 2.0 - 1.0;
  vec2 boil = vec2(bx, by) * uBoilAmpPct * uViewport.y;

  vec2 offset = nrm * halfW * aSide + boil;
  vec4 clip = clipC;
  clip.xy += offset / uViewport * 2.0 * clipC.w;
  gl_Position = clip;

  vU = aU;
  vSide = aSide;
  vColor = aColor;
  vSeed = aStrokeSeed;
  vDrawT = smoothstep(aDrawWindow.x, aDrawWindow.y, uDraw);
}
`;

const CHALK_FRAGMENT = /* glsl */ `
precision highp float;

in float vU;
in float vSide;
in vec3 vColor;
in float vSeed;
in float vDrawT;

uniform float uToothPx;
uniform float uToothContrast;
uniform float uOpacity;
uniform vec3 uColor;

out vec4 outColor;

${GLSL_NOISE}

float ign(vec2 p){ return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }

void main(){
  if (vDrawT <= 0.0 || vU > vDrawT) discard;

  float aa = fwidth(vSide) * 1.5 + 1e-4;
  float edge = 1.0 - smoothstep(1.0 - aa, 1.0, abs(vSide));

  float endTaper = smoothstep(0.0, 0.12, vU) * smoothstep(0.0, 0.12, 1.0 - vU);
  float vary = mix(0.7, 1.0, vnoise2(vec2(vU * 4.0 + vSeed * 11.0, vSeed * 3.0)));
  float pressure = mix(0.55, 1.0, endTaper) * vary;

  vec2 tc = gl_FragCoord.xy / max(uToothPx, 0.5);
  float grain = vnoise2(tc) * 0.6 + vnoise2(tc * 2.03 + 7.0) * 0.4;
  float tooth = mix(1.0, grain, uToothContrast);

  float a = edge * pressure * tooth * uOpacity;
  if (a < ign(gl_FragCoord.xy) * 0.55) discard;

  vec3 col = vColor * uColor * (1.0 + (h21(gl_FragCoord.xy) - 0.5) * 0.06);
  outColor = vec4(col, clamp(a, 0.0, 1.0));
}
`;

const DUST_FRAGMENT = /* glsl */ `
precision highp float;

in float vU;
in float vSide;
in vec3 vColor;
in float vDrawT;

uniform float uOpacity;
uniform float uDustAlpha;
uniform vec3 uColor;

out vec4 outColor;

void main(){
  float on = step(0.001, vDrawT);
  float lead = 1.0 - smoothstep(vDrawT - 0.03, vDrawT + 0.01, vU);
  float edge = 1.0 - smoothstep(0.0, 1.0, abs(vSide));
  float endTaper = smoothstep(0.0, 0.15, vU) * smoothstep(0.0, 0.15, 1.0 - vU);
  float a = edge * endTaper * lead * on * uDustAlpha * uOpacity;
  outColor = vec4(vColor * uColor, a);
}
`;

function baseUniforms(look: LookParams, style: StrokeStyle) {
  return {
    uViewport: { value: new THREE.Vector2(1, 1) },
    uDpr: { value: 1 },
    uDraw: { value: 0 },
    uTime: { value: 0 },
    uOpacity: { value: 1 },
    uColor: { value: new THREE.Color(1, 1, 1) },
    uWidthPx: { value: style.widthPx },
    uTaper: { value: style.taper },
    uBoilHz: { value: look.boilHz },
    uBoilAmpPct: { value: look.boilAmpPct },
    uWidthMulGlobal: { value: 1 },
  };
}

export function createStrokeMaterials(look: LookParams, style: StrokeStyle): StrokeMaterials {
  const chalk = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    uniforms: {
      ...baseUniforms(look, style),
      uToothPx: { value: look.toothPx },
      uToothContrast: { value: look.toothContrast },
    },
    vertexShader: VERTEX,
    fragmentShader: CHALK_FRAGMENT,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.NormalBlending,
  });

  const dust = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    uniforms: {
      ...baseUniforms(look, style),
      uDustAlpha: { value: look.dustAlpha },
    },
    vertexShader: VERTEX,
    fragmentShader: DUST_FRAGMENT,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.NormalBlending,
  });
  dust.uniforms.uWidthMulGlobal.value = look.dustWidthMul;

  return { chalk, dust };
}
