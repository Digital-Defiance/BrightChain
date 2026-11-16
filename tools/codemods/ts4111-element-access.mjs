#!/usr/bin/env node
/**
 * Codemod: rewrite property accesses flagged by TS4111
 * (noPropertyAccessFromIndexSignature) to element access, i.e.
 * `obj.key` -> `obj['key']` and `obj?.key` -> `obj?.['key']`.
 *
 * This is the same rewrite as TypeScript's "Use element access" quick fix.
 * Use it for genuinely dynamic keys (req.params, req.query, headers,
 * process.env, untrusted request bodies). Where the object has a known shape,
 * give it a real type instead.
 *
 * Usage:
 *   node tools/codemods/ts4111-element-access.mjs <tsconfig> [--files <regex>] [--exclude <regex>] [--dry]
 *
 * The tsconfig is compiled with noPropertyAccessFromIndexSignature forced on.
 * Only files whose workspace-relative path matches --files (and not --exclude)
 * are rewritten.
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const ts = require('typescript');

const args = process.argv.slice(2);
const configPath = path.resolve(args[0] ?? '');
const flag = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const filesRe = new RegExp(flag('--files') ?? '.');
const excludeRe = flag('--exclude') ? new RegExp(flag('--exclude')) : null;
const dry = args.includes('--dry');
const root = process.cwd();

const parsed = ts.getParsedCommandLineOfConfigFile(
  configPath,
  { noPropertyAccessFromIndexSignature: true, noEmit: true },
  {
    ...ts.sys,
    onUnRecoverableConfigFileDiagnostic: (d) => {
      throw new Error(ts.flattenDiagnosticMessageText(d.messageText, '\n'));
    },
  },
);
const program = ts.createProgram({
  rootNames: parsed.fileNames,
  options: parsed.options,
  projectReferences: [],
});

/** file -> list of { start, end, replacement } */
const edits = new Map();

for (const sf of program.getSourceFiles()) {
  const rel = path.relative(root, sf.fileName);
  if (rel.startsWith('..') || rel.includes('node_modules')) continue;
  if (!filesRe.test(rel) || (excludeRe && excludeRe.test(rel))) continue;
  for (const d of program.getSemanticDiagnostics(sf)) {
    if (d.code !== 4111 || d.start === undefined) continue;
    // Find the PropertyAccessExpression whose name starts at d.start.
    let found;
    const visit = (node) => {
      if (found) return;
      if (
        ts.isPropertyAccessExpression(node) &&
        node.name.getStart(sf) === d.start
      ) {
        found = node;
        return;
      }
      if (node.getStart(sf) <= d.start && d.start < node.getEnd())
        ts.forEachChild(node, visit);
    };
    visit(sf);
    if (!found) {
      console.warn(
        `skip (no node): ${rel}:${sf.getLineAndCharacterOfPosition(d.start).line + 1}`,
      );
      continue;
    }
    const name = found.name.text;
    // Replace from end of the expression (before `.`/`?.`) to end of name.
    const exprEnd = found.expression.getEnd();
    const replacement = found.questionDotToken
      ? `?.['${name}']`
      : `['${name}']`;
    const list = edits.get(sf.fileName) ?? [];
    list.push({ start: exprEnd, end: found.name.getEnd(), replacement });
    edits.set(sf.fileName, list);
  }
}

let total = 0;
for (const [file, list] of edits) {
  const unique = [...new Map(list.map((e) => [e.start, e])).values()].sort(
    (a, b) => b.start - a.start,
  );
  let text = fs.readFileSync(file, 'utf8');
  for (const e of unique)
    text = text.slice(0, e.start) + e.replacement + text.slice(e.end);
  total += unique.length;
  console.log(`${unique.length}\t${path.relative(root, file)}`);
  if (!dry) fs.writeFileSync(file, text);
}
console.log(
  `${dry ? 'would rewrite' : 'rewrote'} ${total} accesses in ${edits.size} files`,
);
