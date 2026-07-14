/**
 * Scene registry. Each scene file exports `<id>Scene: FilmScene`.
 * Ranges come from FILM.scenes; the runtime pairs them by id.
 */

import type { FilmScene } from '../lib/types';
import { newtonScene } from './01-newton';
import { flyerScene } from './02-flyer';
import { bootScene } from './03-boot';
import { moonScene } from './04-moon';

export const SCENES: FilmScene[] = [newtonScene, flyerScene, bootScene, moonScene];
