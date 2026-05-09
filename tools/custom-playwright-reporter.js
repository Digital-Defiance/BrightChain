const fs   = require('fs');
const path = require('path');
const os   = require('os');

// Shared progress file — read by tools/scripts/e2e-with-progress.mjs.
// Same env var convention as custom-jest-reporter.js so both can coexist.
const PROGRESS_FILE =
  process.env.BRIGHTCHAIN_PROGRESS_FILE ||
  path.join(os.tmpdir(), 'brightchain-e2e-progress.jsonl');

function emit(record) {
  try {
    fs.appendFileSync(PROGRESS_FILE, JSON.stringify(record) + '\n');
  } catch { /* non-fatal */ }
}

class CustomPlaywrightReporter {
  constructor() {
    this._totalTests    = 0;
    this._startTime     = 0;
  }

  /**
   * Called once before any test runs.
   * suite.allTests() gives the EXACT total — Playwright knows everything upfront.
   */
  onBegin(config, suite) {
    this._startTime  = Date.now();
    this._totalTests = suite.allTests().length;
    emit({
      event:       'run_start',
      ts:          this._startTime,
      totalTests:  this._totalTests,
      // Project name from config if available
      project:     config.rootDir
        ? path.basename(path.dirname(config.rootDir))
        : 'unknown',
    });
  }

  /**
   * Called after every individual test — the high-resolution hook.
   */
  onTestEnd(test, result) {
    emit({
      event:      'test_end',
      ts:         Date.now(),
      status:     result.status,           // 'passed' | 'failed' | 'timedOut' | 'skipped' | 'interrupted'
      duration:   result.duration,         // ms
      title:      test.title,
      fullTitle:  test.titlePath().join(' › '),
      file:       test.location?.file,
      line:       test.location?.line,
      totalTests: this._totalTests,        // repeat so wrapper always has it
      failureMsg: result.status === 'failed' || result.status === 'timedOut'
        ? (result.error?.message || '').split('\n')[0]
        : undefined,
    });
  }

  onEnd(result) {
    emit({
      event:    'run_end',
      ts:       Date.now(),
      status:   result.status,
      duration: Date.now() - this._startTime,
    });
  }
}

module.exports = CustomPlaywrightReporter;
