#!/usr/bin/env node
/**
 * e2e-with-progress.mjs
 *
 * Runs the full e2e suite sequentially with a live ETA progress bar.
 * Errors are written to e2e-errors.log in the workspace root.
 *
 * Projects run in order:
 *   1. brightchain-api-e2e              (Jest,       ~348 tests)
 *   2. brightchain-react-e2e            (Playwright, ~368 tests)
 *   3. digitalburnbag-react-components  (Playwright, ~160 tests)
 *                                                    ──────────
 *                                        Total:      ~876 tests
 *
 * The Playwright total is reported exactly by the reporter at runtime
 * (onBegin receives suite.allTests().length), so the ETA improves once
 * each project starts. The Jest total comes from the test-count cache.
 *
 * Usage:
 *   yarn test:all:e2e:dev:progress
 *   yarn test:all:e2e:dev:progress --skip-nx-cache
 */

import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { createInterface } from 'readline';

const ROOT = process.cwd();
const ERROR_LOG = path.join(ROOT, 'e2e-errors.log');

// ── shared progress file ──────────────────────────────────────────────────────
const PROGRESS_FILE =
  process.env.BRIGHTCHAIN_PROGRESS_FILE ||
  path.join(os.tmpdir(), 'brightchain-e2e-progress.jsonl');

// ── timing cache (persists last run duration for initial ETA guesstimate) ─────
const TIMING_CACHE = path.join(ROOT, '.nx', '.e2e-run-timing.json');

// ── error log helpers ─────────────────────────────────────────────────────────
let errorLogFd = null;

function openErrorLog() {
  try {
    errorLogFd = fs.openSync(ERROR_LOG, 'w');
    const header = `E2E Error Log — ${new Date().toISOString()}\n${'─'.repeat(72)}\n\n`;
    fs.writeSync(errorLogFd, header);
  } catch {
    errorLogFd = null;
  }
}

function logError(entry) {
  if (!errorLogFd) return;
  try {
    fs.writeSync(errorLogFd, entry);
  } catch {
    /* non-fatal */
  }
}

function closeErrorLog(hadErrors) {
  if (!errorLogFd) return;
  try {
    if (!hadErrors) {
      fs.writeSync(errorLogFd, 'No failures.\n');
    }
    fs.closeSync(errorLogFd);
  } catch {
    /* non-fatal */
  }
}

// ── ANSI helpers ──────────────────────────────────────────────────────────────
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  grey: '\x1b[90m',
  clearLine: '\x1b[2K\r',
  up1: '\x1b[1A',
};

function bar(fraction, width = 36) {
  const filled = Math.max(0, Math.min(width, Math.round(fraction * width)));
  return `[${'█'.repeat(filled)}${'░'.repeat(width - filled)}]`;
}

function fmt(seconds) {
  if (!isFinite(seconds) || seconds < 0) return ' --:--';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2)}m${String(s).padStart(3)}s`;
}

// ── state ─────────────────────────────────────────────────────────────────────
let grandTotal = 0;
let grandCompleted = 0;
let grandPassed = 0;
let grandFailed = 0;
let grandSkipped = 0;

const projectTotals = {};
const rateSamples = [];
const RATE_WINDOW = 200;

// Historical run duration for initial ETA guesstimate (loaded from timing cache)
let lastRunDuration = null; // seconds

// Full failure details for log file
const failures = []; // { project, title, file, line, msg, fullMsg }

let currentProject = '';
let lastTestTitle = '';
let startTime = Date.now();
let progressLineDrawn = false;
let lastFileSize = 0;
let lastLineBuffer = '';

// ── read new lines from the JSONL progress file ───────────────────────────────
function readNewProgressLines() {
  let stat;
  try {
    stat = fs.statSync(PROGRESS_FILE);
  } catch {
    return;
  }
  if (stat.size <= lastFileSize) return;

  const fd = fs.openSync(PROGRESS_FILE, 'r');
  const buf = Buffer.alloc(stat.size - lastFileSize);
  fs.readSync(fd, buf, 0, buf.length, lastFileSize);
  fs.closeSync(fd);
  lastFileSize = stat.size;

  const chunk = lastLineBuffer + buf.toString('utf8');
  const lines = chunk.split('\n');
  lastLineBuffer = lines.pop();

  for (const line of lines) {
    if (!line.trim()) continue;
    let rec;
    try {
      rec = JSON.parse(line);
    } catch {
      continue;
    }

    switch (rec.event) {
      case 'run_start': {
        if (rec.totalTests > 0) {
          const key = currentProject || rec.project || 'playwright';
          projectTotals[key] = rec.totalTests;
          grandTotal = Object.values(projectTotals).reduce((a, b) => a + b, 0);
        }
        break;
      }

      case 'test_end': {
        if (rec.totalTests > 0) {
          const key = currentProject || 'playwright';
          if (!projectTotals[key] || projectTotals[key] < rec.totalTests) {
            projectTotals[key] = rec.totalTests;
            grandTotal = Object.values(projectTotals).reduce(
              (a, b) => a + b,
              0,
            );
          }
        }
        const status = rec.status;
        if (status === 'passed') {
          grandPassed++;
        } else if (status === 'failed' || status === 'timedOut') {
          grandFailed++;
          const failure = {
            project: currentProject,
            title: rec.fullTitle || rec.title,
            file: rec.file,
            line: rec.line,
            msg: rec.failureMsg || '',
            fullMsg: rec.failureMsg || '',
            failureMessages: rec.failureMessages,
          };
          failures.push(failure);
          logError(formatFailureForLog(failure));
        } else {
          grandSkipped++;
        }
        grandCompleted++;
        if (rec.title) lastTestTitle = rec.title;
        rateSamples.push({ t: rec.ts || Date.now(), n: grandCompleted });
        if (rateSamples.length > RATE_WINDOW) rateSamples.shift();
        break;
      }

      case 'test_case': {
        const status = rec.status;
        if (status === 'passed') {
          grandPassed++;
        } else if (status === 'failed') {
          grandFailed++;
          const failure = {
            project: currentProject,
            title: rec.fullName,
            file: rec.suitePath,
            line: undefined,
            msg: rec.failureMsg || '',
            fullMsg: rec.failureMsg || '',
            failureMessages: rec.failureMessages,
          };
          failures.push(failure);
          logError(formatFailureForLog(failure));
        } else {
          grandSkipped++;
        }
        grandCompleted++;
        if (rec.fullName) lastTestTitle = rec.fullName;
        rateSamples.push({ t: rec.ts || Date.now(), n: grandCompleted });
        if (rateSamples.length > RATE_WINDOW) rateSamples.shift();
        break;
      }

      case 'suite_done': {
        if (rec.aggTotalTests) {
          const key = currentProject || 'jest-e2e';
          const prev = projectTotals[key] || 0;
          if (rec.aggTotalTests > prev) {
            projectTotals[key] = rec.aggTotalTests;
            grandTotal = Object.values(projectTotals).reduce(
              (a, b) => a + b,
              0,
            );
          }
        }
        break;
      }
    }
  }
}

function formatFailureForLog(f) {
  const loc = f.file
    ? `${path.relative(ROOT, f.file)}${f.line ? `:${f.line}` : ''}`
    : '';
  const ts = new Date().toISOString();
  // Use full pre-stripped message block when available, else short msg.
  const msgs =
    Array.isArray(f.failureMessages) && f.failureMessages.length > 0
      ? f.failureMessages
      : f.fullMsg
        ? [f.fullMsg]
        : [];
  const msgBlock = msgs
    .map((m) =>
      m
        .split('\n')
        .map((l) => `    ${l}`)
        .join('\n'),
    )
    .join('\n\n');
  return (
    `[${ts}] [${f.project}] FAILED: ${f.title}\n` +
    (loc ? `  Location: ${loc}\n` : '') +
    (msgBlock ? `\n${msgBlock}\n` : '') +
    `\n${'─'.repeat(72)}\n\n`
  );
}

// ── ETA calculation ───────────────────────────────────────────────────────────
function computeEta() {
  const elapsed = (Date.now() - startTime) / 1000;

  // Before any test completes, use last run duration as initial guesstimate
  if (grandCompleted === 0) {
    return lastRunDuration !== null
      ? Math.max(0, lastRunDuration - elapsed)
      : null;
  }

  if (grandTotal === 0) return null;
  if (grandCompleted >= grandTotal) return 0;
  const remaining = grandTotal - grandCompleted;

  // Long-term average rate (tests/second) — reliable baseline.
  const avgRate = elapsed > 0 ? grandCompleted / elapsed : 0;

  // Sliding-window rate (tests/second) — responsive to recent activity.
  let windowRate = 0;
  if (rateSamples.length >= 2) {
    const oldest = rateSamples[0];
    const newest = rateSamples[rateSamples.length - 1];
    const dt = (newest.t - oldest.t) / 1000; // seconds
    const dn = newest.n - oldest.n;
    if (dt > 0 && dn > 0) windowRate = dn / dt;
  }

  // Floor the effective rate at 40% of the overall average so that a
  // temporary slow patch cannot cause an order-of-magnitude ETA spike.
  const effectiveRate =
    windowRate > 0 ? Math.max(windowRate, avgRate * 0.4) : avgRate;

  if (effectiveRate <= 0) return null;
  const rateEta = remaining / effectiveRate;

  // Blend with historical run duration: early in the run the rate-based
  // estimate is unreliable (workers still spinning up, low observed throughput).
  // Weight the historical estimate heavily at the start and hand off to
  // rate-based once we are past ~50% completion.
  //
  // Cap the rate-based ETA at 1.5× the historical duration to prevent
  // multi-hour ETAs from slow startup dragging the estimate off.
  if (lastRunDuration !== null && grandTotal > 0) {
    const historicalEta = Math.max(0, lastRunDuration - elapsed);
    const maxRateEta = Math.max(0, lastRunDuration * 1.5 - elapsed);
    const cappedRateEta = Math.min(rateEta, maxRateEta);
    // histWeight: 1.0 at 0% progress, 0.0 at 50% progress (linear)
    const progress = grandCompleted / grandTotal;
    const histWeight = Math.max(0, 1 - progress * 2);
    return histWeight * historicalEta + (1 - histWeight) * cappedRateEta;
  }

  return rateEta;
}

// ── render ────────────────────────────────────────────────────────────────────
function redraw() {
  readNewProgressLines();

  const fraction =
    grandTotal > 0 ? Math.min(1, grandCompleted / grandTotal) : 0;
  const elapsed = (Date.now() - startTime) / 1000;
  const eta = computeEta();
  const pct = (fraction * 100).toFixed(1).padStart(5);
  const totalStr = grandTotal > 0 ? String(grandTotal) : '?';
  const maxName = 40;
  const shortName =
    lastTestTitle.length > maxName
      ? '…' + lastTestTitle.slice(-(maxName - 1))
      : lastTestTitle;

  const line = [
    `${C.cyan}${C.bold}${bar(fraction)}${C.reset}`,
    `${C.yellow}${pct}%${C.reset}`,
    `${C.grey}${grandCompleted}/${totalStr}${C.reset}`,
    `${C.blue}${fmt(elapsed)}${C.reset}`,
    `${C.magenta}ETA ${eta !== null ? fmt(eta) : ' --:--'}${C.reset}`,
    grandFailed > 0
      ? `${C.red}✖ ${grandFailed} failed${C.reset}`
      : `${C.green}✔ ${grandPassed}${C.reset}`,
    grandSkipped > 0 ? `${C.grey}⊘ ${grandSkipped}${C.reset}` : null,
    currentProject ? `${C.grey}[${currentProject}]${C.reset}` : null,
    shortName ? `${C.grey}${shortName}${C.reset}` : null,
  ]
    .filter(Boolean)
    .join('  ');

  if (progressLineDrawn) process.stderr.write(C.up1 + C.clearLine);
  process.stderr.write(line + '\n');
  progressLineDrawn = true;
}

// ── run a single nx e2e project ───────────────────────────────────────────────
function runProject(projectName, extraArgs = []) {
  return new Promise((resolve) => {
    currentProject = projectName;
    progressLineDrawn = false;

    process.stderr.write(`\n${C.cyan}${C.bold}▶ ${projectName}${C.reset}\n\n`);

    const nxArgs = [
      'nx',
      'run',
      `${projectName}:e2e`,
      '--configuration=development',
      ...extraArgs,
    ];

    const child = spawn('yarn', nxArgs, {
      cwd: ROOT,
      env: {
        ...process.env,
        NODE_ENV: process.env.NODE_ENV || 'development',
        BRIGHTCHAIN_PROGRESS_FILE: PROGRESS_FILE,
        NX_TUI: 'false',
      },
      stdio: ['inherit', 'pipe', 'pipe'],
    });

    const rlOut = createInterface({ input: child.stdout });
    rlOut.on('line', (line) => {
      if (/^\s*[✔✖►]\s+nx run/.test(line)) return;
      process.stdout.write(line + '\n');
    });

    const rlErr = createInterface({ input: child.stderr });
    rlErr.on('line', (line) => {
      if (/^\s*[✔✖►]\s+nx run/.test(line)) return;
      process.stderr.write(line + '\n');
    });

    child.on('close', (code) => resolve(code ?? 0));
  });
}

// ── timing cache helpers ─────────────────────────────────────────────────────
function loadTimingCache() {
  try {
    const data = JSON.parse(fs.readFileSync(TIMING_CACHE, 'utf8'));
    if (
      typeof data.lastDurationSeconds === 'number' &&
      data.lastDurationSeconds > 0
    ) {
      return data.lastDurationSeconds;
    }
  } catch {
    /* no cache yet */
  }
  return null;
}

function saveTimingCache(durationSeconds) {
  try {
    const data = {
      lastDurationSeconds: Math.round(durationSeconds * 10) / 10,
      lastRunAt: new Date().toISOString(),
    };
    fs.writeFileSync(
      TIMING_CACHE,
      JSON.stringify(data, null, 2) + '\n',
      'utf8',
    );
  } catch {
    /* non-fatal */
  }
}

// ── load cached test totals for e2e projects ─────────────────────────────────
// pathFilter narrows to only files within a specific subdirectory,
// so digitalburnbag-react-components e2e files are not mixed with its unit tests.
function loadCachedTotal(projectName, pathFilter) {
  const cacheFile = path.join(ROOT, '.nx', 'test-count-cache.json');
  try {
    const cache = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
    let total = 0;
    for (const [filePath, entry] of Object.entries(cache)) {
      if (
        filePath.includes(projectName) &&
        (!pathFilter || filePath.includes(pathFilter)) &&
        typeof entry.count === 'number'
      ) {
        total += entry.count;
      }
    }
    return total > 0 ? total : null;
  } catch {
    return null;
  }
}

// ── main ──────────────────────────────────────────────────────────────────────
const extraArgs = process.argv.slice(2);

openErrorLog();
try {
  fs.unlinkSync(PROGRESS_FILE);
} catch {
  /* didn't exist */
}

// ── load last run timing for initial ETA guesstimate ─────────────────────────
lastRunDuration = loadTimingCache();
if (lastRunDuration !== null) {
  process.stderr.write(
    `${C.grey}Previous run: ${fmt(lastRunDuration)} — using as initial ETA${C.reset}\n`,
  );
}

// Seed all three e2e project totals from cache so the progress bar has a
// realistic denominator from the very first test, not just after each project starts.
// Run `yarn test:count:refresh` to update these if test counts change significantly.
const E2E_PROJECTS = [
  { key: 'brightchain-api-e2e', pathFilter: 'brightchain-api-e2e/src' },
  { key: 'brightchain-react-e2e', pathFilter: 'brightchain-react-e2e/src' },
  { key: 'digitalburnbag-react-components', pathFilter: '__tests__/e2e' },
];

let seededTotal = 0;
for (const { key, pathFilter } of E2E_PROJECTS) {
  const n = loadCachedTotal(key, pathFilter);
  if (n) {
    projectTotals[key] = n;
    grandTotal += n;
    seededTotal += n;
    process.stderr.write(
      `${C.grey}Pre-flight: ${key} ~${n} tests (cached)${C.reset}\n`,
    );
  }
}
if (seededTotal === 0) {
  process.stderr.write(
    `${C.yellow}Pre-flight: no cache found — run 'yarn test:count:refresh' for better ETA${C.reset}\n`,
  );
} else {
  process.stderr.write(
    `${C.grey}Pre-flight: ~${seededTotal} total e2e tests expected${C.reset}\n`,
  );
}
process.stderr.write(`${C.grey}Errors logged to: ${ERROR_LOG}${C.reset}\n`);

startTime = Date.now();
process.stderr.write(
  `\n${C.cyan}${C.bold}E2E Test Run — 3 projects (sequential)${C.reset}\n`,
);

const pollInterval = setInterval(redraw, 200);
let exitCode = 0;

// 1. brightchain-api-e2e (Jest)
const apiCode = await runProject('brightchain-api-e2e', [
  '--skip-nx-cache',
  ...extraArgs,
]);
if (apiCode !== 0) exitCode = apiCode;

// 2. brightchain-react-e2e (Playwright, monitored config)
// --config passes the alternate playwright config to the @nx/playwright executor.
// --skip-nx-cache ensures the tests actually run rather than replaying cached results.
const reactCode = await runProject('brightchain-react-e2e', [
  '--config=brightchain-react-e2e/playwright.config.monitored.ts',
  '--skip-nx-cache',
  ...extraArgs,
]);
if (reactCode !== 0) exitCode = reactCode;

// 3. digitalburnbag-react-components (Playwright, monitored config)
const burnbagCode = await runProject('digitalburnbag-react-components', [
  '--config=digitalburnbag-react-components/playwright.config.monitored.ts',
  '--skip-nx-cache',
  ...extraArgs,
]);
if (burnbagCode !== 0) exitCode = burnbagCode;

clearInterval(pollInterval);
readNewProgressLines();

// ── final summary ─────────────────────────────────────────────────────────────
const duration = ((Date.now() - startTime) / 1000).toFixed(1);

if (progressLineDrawn) process.stderr.write(C.up1 + C.clearLine);
const finalLine = [
  `${C.green}${C.bold}${bar(1)}${C.reset}`,
  `${C.yellow}100.0%${C.reset}`,
  `${C.grey}${grandCompleted}/${grandTotal || grandCompleted}${C.reset}`,
  `${C.blue}${fmt(parseFloat(duration))}${C.reset}`,
  `${C.magenta}ETA   0m  0s${C.reset}`,
  grandFailed > 0
    ? `${C.red}✖ ${grandFailed} failed${C.reset}`
    : `${C.green}✔ ${grandPassed} passed${C.reset}`,
  grandSkipped > 0 ? `${C.grey}⊘ ${grandSkipped} skipped${C.reset}` : null,
]
  .filter(Boolean)
  .join('  ');
process.stderr.write(finalLine + '\n');
process.stderr.write(`\n${C.cyan}🏁 E2E finished in ${duration}s${C.reset}\n`);
saveTimingCache(parseFloat(duration));

if (failures.length > 0) {
  process.stderr.write(
    `\n${C.red}${C.bold}${failures.length} test(s) failed — see ${ERROR_LOG}${C.reset}\n`,
  );
  // Print brief summary to terminal
  for (const { project, title, msg } of failures) {
    process.stderr.write(`  ${C.red}✖ [${project}] ${title}${C.reset}\n`);
    if (msg) process.stderr.write(`    ${C.grey}${msg}${C.reset}\n`);
  }
} else {
  process.stderr.write(`${C.green}All e2e tests passed.${C.reset}\n`);
}

closeErrorLog(failures.length > 0);
try {
  fs.unlinkSync(PROGRESS_FILE);
} catch {
  /* already gone */
}
process.exit(exitCode);
