/**
 * Generate public/tokens.md from src/tokens.css.
 *
 * The token sheet stays the single source: this runs ahead of every build
 * (see package.json), so the download on /tokens can never drift from the
 * CSS. Sections come from the sheet's own comments; each comment inside a
 * block opens a section, its first sentence as the heading and the rest as
 * the section's note.
 */

import { readFileSync, writeFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/tokens.css', import.meta.url), 'utf8');

/** Pull one selector's block out of the sheet. */
function block(selector) {
  const at = css.indexOf(selector);
  if (at === -1) return '';
  const open = css.indexOf('{', at);
  let depth = 1;
  let i = open + 1;
  while (i < css.length && depth > 0) {
    if (css[i] === '{') depth += 1;
    if (css[i] === '}') depth -= 1;
    i += 1;
  }
  return css.slice(open + 1, i - 1);
}

/** Split a block into [comment | token] events, in order. */
function events(body) {
  const out = [];
  const re = /\/\*([\s\S]*?)\*\/|(--[\w-]+)\s*:\s*([^;]+);/g;
  let m;
  while ((m = re.exec(body)) !== null) {
    if (m[1] !== undefined) {
      const text = m[1].replace(/^\s*\*?/gm, '').replace(/\s+/g, ' ').trim();
      if (text) out.push({ comment: text });
    } else {
      out.push({ name: m[2], value: m[3].replace(/\s+/g, ' ').trim() });
    }
  }
  return out;
}

/** Render one block as sections of markdown table rows. */
function render(body, fallbackTitle) {
  const lines = [];
  let open = false;
  for (const e of events(body)) {
    if (e.comment) {
      const stop = e.comment.indexOf('. ');
      const head = (stop === -1 ? e.comment : e.comment.slice(0, stop + 1)).replace(/\.$/, '');
      const rest = stop === -1 ? '' : e.comment.slice(stop + 2).trim();
      lines.push('', `## ${head}`, '');
      if (rest) lines.push(rest, '');
      open = false;
    } else {
      if (!open) {
        if (lines.length === 0) lines.push('', `## ${fallbackTitle}`, '');
        lines.push('| Token | Value |', '| --- | --- |');
        open = true;
      }
      lines.push(`| \`${e.name}\` | \`${e.value}\` |`);
    }
  }
  return lines;
}

const out = [
  '# Anteon design tokens',
  '',
  'One name for every value the shell uses, all served from `src/tokens.css`.',
  'The film keeps its chalk look in `LOOK` (`src/lib/types.ts`); everything',
  'outside the board reads from here. This file is generated from the sheet',
  'by `scripts/tokens-md.mjs` on every build.',
  ...render(block(':root'), 'Tokens'),
  '',
  '# Dark theme',
  '',
  'The paper-side inks inverted onto a near-black ground; the board, the',
  'chalk, and the flag pair are the film’s own palette and hold in every',
  'mode. `data-theme="dark"` is the explicit choice; `system` (and no',
  'attribute at all) follows the OS.',
  ...render(block(':root[data-theme="dark"]'), 'Overrides'),
  '',
];

writeFileSync(new URL('../public/tokens.md', import.meta.url), out.join('\n'));
console.log('public/tokens.md written');
