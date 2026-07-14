/** Stub. film-runtime replaces this file per SPEC.md. */

export interface CaptionsApi {
  update(p: number): void;
  buildStatic(): void;
}

export function createCaptions(): CaptionsApi {
  throw new Error('captions.ts is a stub; film-runtime implements it');
}
