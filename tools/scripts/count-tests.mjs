#!/usr/bin/env node
/**
 * count-tests.mjs
 *
 * Counts the total number of test cases across all nx projects by:
 *   1. Running `nx run <project>:test -- --listTests` in parallel (8 at a time)
 *      to get test file paths per project
 *   2. Parsing each file with a regex to count it() / test() / it.each() calls
 *
 * Results are cached to .nx/test-count-cache.json (keyed by file mtime+size)
 * so repeated runs are fast. Only changed files are re-counted.
 *
 * Usage:
 *   node tools/scripts/count-tests.mjs              # count all (uses cache)
 *   node tools/scripts/count-tests.mjs --no-cache   # force full recount
 *   node tools/scripts/count-tests.mjs --json       # output JSON summary
 *
 * Also used by test-with-progress.mjs for pre-flight total estimation.
 */

import { spawn, spawnSync } from 'child_process';
import fs   from 'fs';
import path from 'path';

const ROOT        = process.cwd();
const CACHE_FILE  = path.join(ROOT, '.nx', 'test-count-cache.json');
const NO_CACHE    = process.argv.includes('--no-cache');
const JSON_OUTPUT = process.argv.includes('--json');
const CONCURRENCY = 8; // parallel nx --listTests calls

// ── load / save cache ─────────────────────────────────────────────────────────
function loadCache() {
  if (NO_CACHE) return {};
  try { return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')); } catch { return {}; }
}

function saveCache(cache) {
  try {
    fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
  } catch { /* non-fatal */ }
}

// ── file fingerprint for cache key ───────────────────────────────────────────
function fingerprint(filePath) {
  try {
    const s = fs.statSync(filePath);
    return `${s.mtimeMs}:${s.size}`;
  } catch { return null; }
}

// ── count tests in a single file ─────────────────────────────────────────────
// Counts: it(), test(), it.each(), test.each(), and common variants.
// .each calls attempt to count data rows for a better estimate.
// Dynamic test generation (loops, factories) cannot be counted statically.

function countEachRows(src, offset) {
  let i = offset;
  while (i < src.length && /\s/.test(src[i])) i++;

  if (src[i] === '`') {
    // Tagged template table — count non-empty, non-header lines
    const end = src.indexOf('`', i + 1);
    if (end === -1) return 1;
    const table = src.slice(i + 1, end);
    const rows = table.split('\n').filter(l => l.trim() && !l.includes('$'));
    return Math.max(1, rows.length);
  }

  if (src[i] === '[') {
    // Array of arrays or flat array — count top-level commas at depth 1
    let depth = 0, j = i;
    while (j < src.length) {
      if (src[j] === '[') depth++;
      else if (src[j] === ']') { depth--; if (depth === 0) break; }
      j++;
    }
    const arr = src.slice(i, j + 1);
    let topCommas = 0, d = 0;
    for (const ch of arr) {
      if (ch === '[' || ch === '(') d++;
      else if (ch === ']' || ch === ')') d--;
      else if (ch === ',' && d === 1) topCommas++;
    }
    const innerArrays = (arr.match(/\[/g) || []).length - 1;
    return innerArrays > 0 ? topCommas + 1 : 1;
  }

  return 1;
}

function countTestsInFile(filePath, cache) {
  const fp = fingerprint(filePath);
  if (fp && cache[filePath] && cache[filePath].fp === fp) {
    return cache[filePath].count;
  }

  let src;
  try { src = fs.readFileSync(filePath, 'utf8'); } catch { return 0; }

  // Strip comments to avoid counting commented-out tests
  const stripped = src
    .replace(/\/\/[^\n]*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');

  let count = 0;
  let m;

  // Count .each calls with row estimation
  const eachRe = /\b(?:it|test)\.each\s*(?:<[^>]*>)?\s*\(/g;
  while ((m = eachRe.exec(stripped)) !== null) {
    const parenIdx = stripped.indexOf('(', m.index + m[0].length - 1);
    count += countEachRows(stripped, parenIdx + 1);
  }

  // Count regular (non-.each) test calls
  const singleRe = /\b(?:it|test)(?:\.(?:only|skip|todo|concurrent|failing))?\s*\(/g;
  while ((m = singleRe.exec(stripped)) !== null) {
    const before = stripped.slice(Math.max(0, m.index - 6), m.index);
    if (!before.includes('.each')) count++;
  }

  if (fp) cache[filePath] = { fp, count };
  return count;
}

// ── get test files for a project via nx --listTests (async) ──────────────────
function getTestFiles(projectName) {
  // brightchain-api-e2e uses an 'e2e' target (Jest executor), not 'test'
  const target = projectName === 'brightchain-api-e2e' ? 'e2e' : 'test';
  return new Promise((resolve) => {
    const args = ['nx', 'run', `${projectName}:${target}`, '--', '--listTests'];
    const child = spawn('yarn', args, {
      cwd: ROOT,
      encoding: 'utf8',
      env: { ...process.env, NX_TUI: 'false' },
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', d => { stdout += d; });
    child.stderr.on('data', d => { stderr += d; });

    child.on('close', (code) => {
      if (code !== 0) { resolve([]); return; }
      const output = stdout + stderr;
      const files = output
        .split('\n')
        .map(l => l.trim())
        .filter(l => l.startsWith('/') && /\.[jt]sx?$/.test(l));
      resolve(files);
    });

    // Timeout safety
    setTimeout(() => { child.kill(); resolve([]); }, 30_000);
  });
}

// ── parallel map with bounded concurrency ────────────────────────────────────
async function parallelMap(items, fn, concurrency) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, worker)
  );
  return results;
}

// ── get all projects with a test target (plus Jest-based e2e projects) ───────
function getTestableProjects() {
  const testResult = spawnSync(
    'yarn',
    ['nx', 'show', 'projects', '--withTarget=test', '--json'],
    { cwd: ROOT, encoding: 'utf8', env: { ...process.env, NX_TUI: 'false' }, timeout: 15_000 }
  );
  const testProjects = testResult.status === 0
    ? (() => { try { return JSON.parse(testResult.stdout); } catch { return []; } })()
    : [];

  // brightchain-api-e2e uses Jest (executor: @nx/jest:jest) under an 'e2e' target.
  // --listTests hangs because the target has dependsOn: [brightchain-api:build].
  // We count its files directly instead of via nx --listTests.
  const jestE2eProjects = []; // handled separately below via direct file scan

  return [...new Set([...testProjects, ...jestE2eProjects])];
}

// ── directly scan a directory for test files (no nx invocation) ──────────────
function scanTestFiles(dir) {
  const results = [];
  function walk(d) {
    let entries;
    try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const full = path.join(d, e.name);
      if (e.isDirectory() && e.name !== 'node_modules' && e.name !== 'dist') {
        walk(full);
      } else if (e.isFile() && /\.(spec|test)\.[jt]sx?$/.test(e.name)) {
        results.push(full);
      }
    }
  }
  walk(dir);
  return results;
}

// ── main ──────────────────────────────────────────────────────────────────────
const cache    = loadCache();
const projects = getTestableProjects();

if (projects.length === 0) {
  console.error('No testable projects found. Is this an nx workspace?');
  process.exit(1);
}

// ── directly count Jest-based e2e projects (--listTests hangs due to dependsOn) ──
// These are counted by direct file scan and added to results separately.
// Also includes Playwright e2e projects — same reason (dependsOn build targets).
const JEST_E2E_DIRS = [
  { project: 'brightchain-api-e2e',             dir: path.join(ROOT, 'brightchain-api-e2e/src') },
  { project: 'brightchain-react-e2e',            dir: path.join(ROOT, 'brightchain-react-e2e/src') },
  { project: 'digitalburnbag-react-components',  dir: path.join(ROOT, 'digitalburnbag-react-components/src/lib/__tests__/e2e') },
];

const jestE2eResults = [];
for (const { project, dir } of JEST_E2E_DIRS) {
  const files = scanTestFiles(dir);
  let tests = 0;
  for (const f of files) tests += countTestsInFile(f, cache);
  jestE2eResults.push({ project, files: files.length, tests });
  if (!JSON_OUTPUT) {
    console.log(`  (direct) ${project.padEnd(42)} ${String(files.length).padStart(3)} files  ${String(tests).padStart(6)} tests`);
  }
}

if (!JSON_OUTPUT) {
  console.log(`\nCounting tests across ${projects.length} projects (${CONCURRENCY} parallel)...\n`);
}

// Fetch all test file lists in parallel
const fileLists = await parallelMap(projects, async (project, i) => {
  if (!JSON_OUTPUT) process.stdout.write(`  [${String(i + 1).padStart(2)}/${projects.length}] ${project.padEnd(42)} listing...\r`);
  const files = await getTestFiles(project);
  if (!JSON_OUTPUT) process.stdout.write(`  [${String(i + 1).padStart(2)}/${projects.length}] ${project.padEnd(42)} ${String(files.length).padStart(3)} files\n`);
  return files;
}, CONCURRENCY);

if (!JSON_OUTPUT) console.log('');

// Count tests in all files (sync, uses cache)
const results = [...jestE2eResults];
let totalFiles = jestE2eResults.reduce((s, r) => s + r.files, 0);
let totalTests = jestE2eResults.reduce((s, r) => s + r.tests, 0);

for (let i = 0; i < projects.length; i++) {
  const project = projects[i];
  const files   = fileLists[i];
  let projectTests = 0;
  for (const f of files) {
    projectTests += countTestsInFile(f, cache);
  }
  totalFiles += files.length;
  totalTests += projectTests;
  results.push({ project, files: files.length, tests: projectTests });
}

saveCache(cache);

if (JSON_OUTPUT) {
  console.log(JSON.stringify({ projects: results, totalFiles, totalTests }, null, 2));
} else {
  const line = '─'.repeat(65);
  console.log(line);
  for (const { project, files, tests } of results) {
    if (files > 0) {
      console.log(`  ${project.padEnd(45)} ${String(files).padStart(4)} files  ${String(tests).padStart(6)} tests`);
    }
  }
  console.log(line);
  console.log(`  ${'TOTAL'.padEnd(45)} ${String(totalFiles).padStart(4)} files  ${String(totalTests).padStart(6)} tests`);
  console.log(`\nCached to ${CACHE_FILE}`);
  console.log('Run "yarn test:count:refresh" to force a full recount.\n');
}
