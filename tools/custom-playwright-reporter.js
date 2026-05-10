const fs = require('fs');
const path = require('path');
const os = require('os');

// Strip ANSI escape codes so log files contain plain text.
// eslint-disable-next-line no-control-regex
const ANSI_RE =
  /[\x1b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><~]/g;
function stripAnsi(str) {
  return typeof str === 'string' ? str.replace(ANSI_RE, '') : '';
}

// Shared progress file — read by tools/scripts/e2e-with-progress.mjs.
// Same env var convention as custom-jest-reporter.js so both can coexist.
const PROGRESS_FILE =
  process.env.BRIGHTCHAIN_PROGRESS_FILE ||
  path.join(os.tmpdir(), 'brightchain-e2e-progress.jsonl');

function emit(record) {
  try {
    fs.appendFileSync(PROGRESS_FILE, JSON.stringify(record) + '\n');
  } catch {
    /* non-fatal */
  }
}

class CustomPlaywrightReporter {
  constructor() {
    this._totalTests = 0;
    this._startTime = 0;
  }

  /**
   * Called once before any test runs.
   * suite.allTests() gives the EXACT total — Playwright knows everything upfront.
   */
  onBegin(config, suite) {
    this._startTime = Date.now();
    this._totalTests = suite.allTests().length;
    emit({
      event: 'run_start',
      ts: this._startTime,
      totalTests: this._totalTests,
      // Project name from config if available
      project: config.rootDir
        ? path.basename(path.dirname(config.rootDir))
        : 'unknown',
    });
  }

  /**
   * Called after every individual test — the high-resolution hook.
   */
  onTestEnd(test, result) {
    const failed = result.status === 'failed' || result.status === 'timedOut';
    // Build a full message block: error message + stack trace (if present).
    let failureMessages;
    if (failed) {
      const parts = [];
      if (result.error?.message) parts.push(stripAnsi(result.error.message));
      if (result.error?.stack) parts.push(stripAnsi(result.error.stack));
      failureMessages = parts.length > 0 ? parts : undefined;
    }
    emit({
      event: 'test_end',
      ts: Date.now(),
      status: result.status, // 'passed' | 'failed' | 'timedOut' | 'skipped' | 'interrupted'
      duration: result.duration, // ms
      title: test.title,
      fullTitle: test.titlePath().join(' › '),
      file: test.location?.file,
      line: test.location?.line,
      totalTests: this._totalTests, // repeat so wrapper always has it
      // First line only — for the live progress display.
      failureMsg: failed
        ? stripAnsi((result.error?.message || '').split('\n')[0])
        : undefined,
      // Full block, ANSI-stripped — written verbatim to the log file.
      failureMessages,
    });
  }

  onEnd(result) {
    emit({
      event: 'run_end',
      ts: Date.now(),
      status: result.status,
      duration: Date.now() - this._startTime,
    });
  }
}

module.exports = CustomPlaywrightReporter;
