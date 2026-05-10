#!/usr/bin/env node
/**
 * test-with-progress.mjs
 *
 * Wraps `nx run-many --target=test` and renders a live ETA/progress bar
 * driven by individual test-case completions (onTestCaseResult), giving
 * much finer-grained rate data than per-suite or per-project events.
 *
 * Architecture:
 *   - tools/custom-jest-reporter.js  →  appends JSONL to a shared tmp file
 *   - this script                    →  polls that file, renders progress bar
 *
 * Usage:
 *   yarn test:all:dev:16:progress
 *   yarn test:all:dev:16:progress --skip-nx-cache
 */

import { spawn, spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { createInterface } from 'readline';

const ROOT = process.cwd();
const ERROR_LOG = path.join(ROOT, 'test-errors.log');

// ── error log helpers ─────────────────────────────────────────────────────────
let errorLogFd = null;

function openErrorLog() {
  try {
    errorLogFd = fs.openSync(ERROR_LOG, 'w');
    const header = `Unit Test Error Log — ${new Date().toISOString()}\n${'─'.repeat(72)}\n\n`;
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
    if (!hadErrors) fs.writeSync(errorLogFd, 'No failures.\n');
    fs.closeSync(errorLogFd);
  } catch {
    /* non-fatal */
  }
}

// ── shared progress file (must match custom-jest-reporter.js) ────────────────
const PROGRESS_FILE =
  process.env.BRIGHTCHAIN_PROGRESS_FILE ||
  path.join(os.tmpdir(), 'brightchain-test-progress.jsonl');

// ── timing cache (persists last run duration for initial ETA guesstimate) ─────
const TIMING_CACHE = path.join(process.cwd(), '.nx', '.test-run-timing.json');

// ── ANSI helpers ─────────────────────────────────────────────────────────────
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

function bar(fraction, width = 32) {
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
let totalProjects = 0;
let completedProjects = 0;

// Test-level counters — driven by test_case events (one per it()/test())
let passedTests = 0;
let failedTests = 0;
let skippedTests = 0;

// knownTotal: best estimate of total tests. Grows as Jest discovers suites.
// We take the max of aggTotalTests seen across all suite_done events.
let knownTotal = 0;

// Historical run duration for initial ETA guesstimate (loaded from timing cache)
let lastRunDuration = null; // seconds

// Rate tracking: sliding window of (timestamp, completedCount) samples
const rateSamples = []; // { t: ms, n: completed }
const RATE_WINDOW = 200; // keep last N samples

// Failure tracking: suitePath → [{ fullName, failureMsg }]
const failedCases = new Map();

// Last test name seen (for display)
let lastTestName = '';

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
  lastLineBuffer = lines.pop(); // hold incomplete trailing line

  for (const line of lines) {
    if (!line.trim()) continue;
    let rec;
    try {
      rec = JSON.parse(line);
    } catch {
      continue;
    }

    switch (rec.event) {
      case 'test_case': {
        const status = rec.status;
        if (status === 'passed') {
          passedTests++;
        } else if (status === 'failed') {
          failedTests++;
          // Accumulate failures per suite
          if (!failedCases.has(rec.suitePath))
            failedCases.set(rec.suitePath, []);
          failedCases.get(rec.suitePath).push({
            fullName: rec.fullName,
            failureMsg: rec.failureMsg || '',
          });
          // Write full failure block to error log immediately
          const ts = new Date().toISOString();
          const shortPath = (rec.suitePath || '')
            .split('/')
            .slice(-3)
            .join('/');
          const msgs =
            Array.isArray(rec.failureMessages) && rec.failureMessages.length > 0
              ? rec.failureMessages
              : rec.failureMsg
                ? [rec.failureMsg]
                : [];
          const msgBlock = msgs
            .map((m) =>
              m
                .split('\n')
                .map((l) => `    ${l}`)
                .join('\n'),
            )
            .join('\n\n');
          logError(
            `[${ts}] FAILED: ${rec.fullName}\n` +
              `  Suite: ${shortPath}\n` +
              (msgBlock ? `\n${msgBlock}\n` : '') +
              `\n${'─'.repeat(72)}\n\n`,
          );
        } else {
          skippedTests++; // 'skipped' | 'todo' | 'pending'
        }
        if (rec.fullName) lastTestName = rec.fullName;

        // Rate sample
        const completed = passedTests + failedTests;
        rateSamples.push({ t: rec.ts || Date.now(), n: completed });
        if (rateSamples.length > RATE_WINDOW) rateSamples.shift();
        break;
      }

      case 'suite_done': {
        // Use Jest's own aggregate to keep knownTotal up to date.
        // aggTotalTests grows as Jest discovers and runs more suites.
        if (rec.aggTotalTests > knownTotal) knownTotal = rec.aggTotalTests;
        break;
      }

      // run_start / run_complete — no action needed
    }
  }
}

// ── ETA calculation ───────────────────────────────────────────────────────────
function computeEta() {
  const completed = passedTests + failedTests;
  const elapsed = (Date.now() - startTime) / 1000;

  // Before any test completes, use last run duration as initial guesstimate
  if (completed === 0) {
    return lastRunDuration !== null
      ? Math.max(0, lastRunDuration - elapsed)
      : null;
  }

  // Effective total: use knownTotal if available, else extrapolate from
  // project completion ratio (rough but better than nothing early on)
  let effectiveTotal = knownTotal;
  if (effectiveTotal === 0 && totalProjects > 0 && completedProjects > 0) {
    // Extrapolate: assume completed projects are representative
    effectiveTotal = Math.round(
      (completed / completedProjects) * totalProjects,
    );
  }
  if (effectiveTotal === 0 || completed >= effectiveTotal) return 0;

  const remaining = effectiveTotal - completed;

  // Long-term average rate (tests/second) — reliable baseline.
  const avgRate = elapsed > 0 ? completed / elapsed : 0;

  // Sliding-window rate (tests/second) — responsive to recent activity.
  let windowRate = 0;
  if (rateSamples.length >= 2) {
    const oldest = rateSamples[0];
    const newest = rateSamples[rateSamples.length - 1];
    const dt = (newest.t - oldest.t) / 1000; // seconds
    const dn = newest.n - oldest.n;
    if (dt > 0 && dn > 0) {
      windowRate = dn / dt;
    }
  }

  // Floor the effective rate at 40% of the overall average so that a
  // temporary slow patch (e.g. hitting a heavy integration suite) cannot
  // cause an order-of-magnitude ETA spike.
  const effectiveRate =
    windowRate > 0 ? Math.max(windowRate, avgRate * 0.4) : avgRate;

  if (effectiveRate <= 0) return null;
  const rateEta = remaining / effectiveRate;

  // Blend with historical run duration: early in the run the rate-based
  // estimate is unreliable because parallel workers are still spinning up
  // and the observed throughput is much lower than the sustained rate.
  // Weight the historical estimate heavily at the start and hand off to
  // rate-based once we are past ~50% completion.
  //
  // We also cap the rate-based ETA at 1.5× the historical duration so that
  // a slow startup cannot cause a multi-hour ETA even at low blend weights.
  if (lastRunDuration !== null && effectiveTotal > 0) {
    const historicalEta = Math.max(0, lastRunDuration - elapsed);
    const maxRateEta = Math.max(0, lastRunDuration * 1.5 - elapsed);
    const cappedRateEta = Math.min(rateEta, maxRateEta);
    // histWeight: 1.0 at 0% progress, 0.0 at 50% progress (linear)
    const progress = completed / effectiveTotal;
    const histWeight = Math.max(0, 1 - progress * 2);
    return histWeight * historicalEta + (1 - histWeight) * cappedRateEta;
  }

  return rateEta;
}

// ── render one progress line ──────────────────────────────────────────────────
function redraw() {
  readNewProgressLines();

  const completed = passedTests + failedTests;
  const effectiveTotal =
    knownTotal ||
    (totalProjects > 0 && completedProjects > 0
      ? Math.round((completed / completedProjects) * totalProjects)
      : 0);
  const fraction =
    effectiveTotal > 0 ? Math.min(1, completed / effectiveTotal) : 0;
  const elapsed = (Date.now() - startTime) / 1000;
  const eta = computeEta();

  const pct = (fraction * 100).toFixed(1).padStart(5);
  const etaStr = eta !== null ? fmt(eta) : ' --:--';
  const elStr = fmt(elapsed);
  const totalStr = effectiveTotal > 0 ? String(effectiveTotal) : '?';

  // Truncate last test name to fit terminal
  const maxName = 38;
  const shortName =
    lastTestName.length > maxName
      ? '…' + lastTestName.slice(-(maxName - 1))
      : lastTestName;

  const line = [
    `${C.cyan}${C.bold}${bar(fraction)}${C.reset}`,
    `${C.yellow}${pct}%${C.reset}`,
    `${C.grey}${completed}/${totalStr} tests${C.reset}`,
    totalProjects > 0
      ? `${C.grey}${completedProjects}/${totalProjects} projects${C.reset}`
      : null,
    `${C.blue}${elStr}${C.reset}`,
    `${C.magenta}ETA ${etaStr}${C.reset}`,
    failedTests > 0
      ? `${C.red}✖ ${failedTests} failed${C.reset}`
      : `${C.green}✔ ${passedTests}${C.reset}`,
    shortName ? `${C.grey}${shortName}${C.reset}` : null,
  ]
    .filter(Boolean)
    .join('  ');

  if (progressLineDrawn) {
    process.stderr.write(C.up1 + C.clearLine);
  }
  process.stderr.write(line + '\n');
  progressLineDrawn = true;
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

// ── load pre-counted total from cache if available ────────────────────────────
function loadCachedTotal() {
  const cacheFile = path.join(process.cwd(), '.nx', 'test-count-cache.json');
  try {
    const cache = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
    // Sum all cached file counts
    let total = 0;
    for (const entry of Object.values(cache)) {
      if (entry && typeof entry.count === 'number') total += entry.count;
    }
    return total > 0 ? total : null;
  } catch {
    return null;
  }
}

// ── run the pre-flight counter (fast, uses cache) ─────────────────────────────
function preflight() {
  process.stderr.write(
    `${C.grey}Running pre-flight test count (uses cache — run 'yarn test:count' to refresh)...${C.reset}\n`,
  );
  const result = spawnSync(
    'node',
    ['tools/scripts/count-tests.mjs', '--json'],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: { ...process.env, NX_TUI: 'false' },
      timeout: 120_000,
    },
  );
  if (result.status === 0) {
    try {
      const data = JSON.parse(result.stdout);
      return data.totalTests || null;
    } catch {
      return null;
    }
  }
  return null;
}

// ── clean up any stale progress file from a previous run ─────────────────────
try {
  fs.unlinkSync(PROGRESS_FILE);
} catch {
  /* didn't exist */
}

openErrorLog();

// ── load last run timing for initial ETA guesstimate ─────────────────────────
lastRunDuration = loadTimingCache();
if (lastRunDuration !== null) {
  process.stderr.write(
    `${C.grey}Previous run: ${fmt(lastRunDuration)} — using as initial ETA${C.reset}\n`,
  );
}

// ── get pre-counted total (from cache or fresh count) ────────────────────────
const cachedTotal = loadCachedTotal();
if (cachedTotal) {
  knownTotal = cachedTotal;
  process.stderr.write(
    `${C.grey}Pre-flight: ~${knownTotal} tests expected (from cache)${C.reset}\n`,
  );
} else {
  const counted = preflight();
  if (counted) {
    knownTotal = counted;
    process.stderr.write(
      `${C.grey}Pre-flight: ~${knownTotal} tests expected${C.reset}\n`,
    );
  } else {
    process.stderr.write(
      `${C.grey}Pre-flight count unavailable — ETA will improve as tests run${C.reset}\n`,
    );
  }
}

process.stderr.write(`${C.grey}Errors logged to: ${ERROR_LOG}${C.reset}\n`);

// ── spawn nx ──────────────────────────────────────────────────────────────────
const extraArgs = process.argv.slice(2);

const nxArgs = [
  'nx',
  'run-many',
  '--target=test',
  '--configuration=development',
  '--parallel=16',
  '--output-style=stream-without-prefixes',
  ...extraArgs,
];

process.stderr.write(
  `${C.cyan}▶ NODE_ENV=development yarn ${nxArgs.join(' ')}${C.reset}\n\n`,
);

const child = spawn('yarn', nxArgs, {
  cwd: process.cwd(),
  env: {
    ...process.env,
    NODE_ENV: process.env.NODE_ENV || 'development',
    BRIGHTCHAIN_PROGRESS_FILE: PROGRESS_FILE,
    NX_TUI: 'false',
  },
  stdio: ['inherit', 'pipe', 'pipe'],
});

startTime = Date.now();

// ── parse nx stdout for project-level counts ──────────────────────────────────
const NX_TOTAL_RE = /Running target \S+ for (\d+) project/i;
const NX_DONE_RE = /^\s*[✔✖►]\s+nx run [\w-]+:test/;

const rlOut = createInterface({ input: child.stdout });
rlOut.on('line', (line) => {
  const totalMatch = line.match(NX_TOTAL_RE);
  if (totalMatch) {
    totalProjects = parseInt(totalMatch[1], 10);
    process.stderr.write(
      `${C.cyan}🚀 Running tests across ${totalProjects} projects (parallel=16)...${C.reset}\n\n`,
    );
    progressLineDrawn = false;
    return;
  }

  if (NX_DONE_RE.test(line)) {
    completedProjects++;
    redraw();
    return;
  }

  // Pass everything else through (Jest failure details, build errors, etc.)
  process.stdout.write(line + '\n');
});

const rlErr = createInterface({ input: child.stderr });
rlErr.on('line', (line) => {
  if (/^\s*[✔✖►]\s+nx run/.test(line)) return;
  process.stderr.write(line + '\n');
});

// ── poll every 150ms so the bar updates between project completions ───────────
const pollInterval = setInterval(redraw, 150);

// ── final summary ─────────────────────────────────────────────────────────────
child.on('close', (code) => {
  clearInterval(pollInterval);
  readNewProgressLines(); // drain any last writes

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  const completed = passedTests + failedTests;

  // Final bar at 100%
  if (progressLineDrawn) process.stderr.write(C.up1 + C.clearLine);
  const finalLine = [
    `${C.green}${C.bold}${bar(1)}${C.reset}`,
    `${C.yellow}100.0%${C.reset}`,
    `${C.grey}${completed}/${knownTotal || completed} tests${C.reset}`,
    totalProjects > 0
      ? `${C.grey}${completedProjects}/${totalProjects} projects${C.reset}`
      : null,
    `${C.blue}${fmt(parseFloat(duration))}${C.reset}`,
    `${C.magenta}ETA   0m  0s${C.reset}`,
    failedTests > 0
      ? `${C.red}✖ ${failedTests} failed${C.reset}`
      : `${C.green}✔ ${passedTests} passed${C.reset}`,
  ]
    .filter(Boolean)
    .join('  ');
  process.stderr.write(finalLine + '\n');

  process.stderr.write(`\n${C.cyan}🏁 Finished in ${duration}s${C.reset}\n`);
  saveTimingCache(parseFloat(duration));

  if (failedCases.size > 0) {
    process.stderr.write(
      `\n${C.red}${C.bold}${failedTests} test(s) failed — see ${ERROR_LOG}${C.reset}\n`,
    );
    // Brief terminal summary
    for (const [suitePath, cases] of failedCases) {
      const shortPath = suitePath.split('/').slice(-3).join('/');
      process.stderr.write(`\n  ${C.red}📄 ${shortPath}${C.reset}\n`);
      for (const { fullName, failureMsg } of cases) {
        process.stderr.write(`    ${C.red}✖ ${fullName}${C.reset}\n`);
        if (failureMsg)
          process.stderr.write(`      ${C.grey}${failureMsg}${C.reset}\n`);
      }
    }
  } else {
    process.stderr.write(`${C.green}All tests passed.${C.reset}\n`);
  }

  closeErrorLog(failedCases.size > 0);
  try {
    fs.unlinkSync(PROGRESS_FILE);
  } catch {
    /* already gone */
  }

  process.exit(code ?? 0);
});
