#!/usr/bin/env node
/**
 * Guard script: ensures no workspace package.json declares a `main`/`module`/`types`
 * entry pointing at a `.ts`/`.tsx` source file.
 *
 * Why: `@nx/js:tsc` copies the source `package.json` verbatim into `dist/<pkg>/`.
 * If `main` references `./src/index.ts`, Node (and tsx's resolver) will try to
 * load that file inside `dist/` where only the compiled `.js` exists, producing
 *   Error: Cannot find module '.../dist/<pkg>/src/index.ts'
 *
 * Use `.js` (compiled) form in the source `package.json`. tsx's loader maps
 * `.js` -> `.ts` automatically when running from source, so dev still works.
 */
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const rootPkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const workspaces = Array.isArray(rootPkg.workspaces)
  ? rootPkg.workspaces
  : (rootPkg.workspaces?.packages ?? []);

const FIELDS = ['main', 'module', 'types', 'typings'];
// Match raw TypeScript source: ends in .ts/.tsx/.mts/.cts but NOT .d.ts/.d.mts/.d.cts.
const BAD = /(?<!\.d)\.(ts|tsx|mts|cts)$/;

const offenders = [];
for (const ws of workspaces) {
  if (ws.includes('*')) continue; // skip glob entries; this repo uses literal paths
  const pkgPath = join(root, ws, 'package.json');
  let pkg;
  try {
    pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  } catch {
    continue;
  }
  for (const field of FIELDS) {
    const v = pkg[field];
    if (typeof v === 'string' && BAD.test(v)) {
      offenders.push({ pkgPath, field, value: v });
    }
  }
  // Also scan exports map (one level deep) for `.ts`/`.tsx` targets.
  if (pkg.exports && typeof pkg.exports === 'object') {
    const stack = [['exports', pkg.exports]];
    while (stack.length) {
      const [path, node] = stack.pop();
      if (typeof node === 'string') {
        if (BAD.test(node))
          offenders.push({ pkgPath, field: path, value: node });
      } else if (node && typeof node === 'object') {
        for (const [k, v] of Object.entries(node)) {
          stack.push([`${path}.${k}`, v]);
        }
      }
    }
  }
}

if (offenders.length) {
  console.error(
    '\n❌ workspace package.json files reference .ts/.tsx in main/module/types/exports:\n',
  );
  for (const { pkgPath, field, value } of offenders) {
    console.error(`  ${pkgPath}\n    ${field} = ${JSON.stringify(value)}`);
  }
  console.error(
    '\nFix: change the extension to .js (or .d.ts for types). The compiled\n' +
      'artifact ships under dist/, and tsx maps .js -> .ts when running from source.\n',
  );
  process.exit(1);
}

console.log(
  `✅ checked ${workspaces.length} workspace package.json files; no .ts main/exports found.`,
);
