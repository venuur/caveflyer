#!/usr/bin/env node
// Keeps the deterministic packages free of nondeterminism and browser/Node APIs.
// The sim tsconfig already excludes DOM and Node typings; this catches the rest.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOTS = ['packages/sim/src', 'packages/bots/src'];
const BANNED = [
  [/\bMath\.random\b/, 'Math.random (use the sim PRNG)'],
  [/\bMath\.(sin|cos|tan|asin|acos|atan|atan2|sinh|cosh|tanh|exp|expm1|log|log1p|log2|log10|pow|cbrt|hypot)\b/, 'Math transcendental (use sim trig)'],
  [/\*\*/, 'exponent operator (engine-dependent for non-integers)'],
  [/\bDate\b/, 'Date'],
  [/\bperformance\b/, 'performance'],
  [/\b(setTimeout|setInterval|setImmediate|requestAnimationFrame|queueMicrotask)\b/, 'timers'],
  [/\b(window|document|navigator|localStorage|globalThis|self)\b/, 'browser globals'],
  [/\b(process|require|Buffer)\b/, 'Node globals'],
  [/\bnew (Map|Set|WeakMap|WeakSet)\b/, 'unordered collection (use arrays sorted by id)'],
  [/\bfor\s*\(\s*(const|let|var)\s+\w+\s+in\b/, 'for...in (key order)'],
  [/from\s+['"](node:|fs|path|pixi)/, 'forbidden import'],
];

function files(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? files(p) : p.endsWith('.ts') ? [p] : [];
  });
}

let errors = 0;
for (const root of ROOTS) {
  for (const file of files(root)) {
    const src = readFileSync(file, 'utf8');
    const lines = src.split('\n');
    // Blank out comments and string contents, keeping line breaks for line numbers.
    const stripped = src
      .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
      .replace(/\/\/.*$/gm, '')
      .split('\n');
    stripped.forEach((code, i) => {
      const line = lines[i] ?? '';
      for (const [re, what] of BANNED) {
        if (re.test(code)) {
          console.error(`${relative('.', file)}:${i + 1}: banned in sim: ${what}\n    ${line.trim()}`);
          errors++;
        }
      }
    });
  }
}
if (errors) {
  console.error(`\nlint-sim: ${errors} problem(s)`);
  process.exit(1);
}
console.log('lint-sim: ok');
