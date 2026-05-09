const fs = require('fs');
const path = require('path');
const os = require('os');

// Shared progress file written by all parallel Jest processes,
// read by tools/scripts/test-with-progress.mjs for live ETA.
// Location: $BRIGHTCHAIN_PROGRESS_FILE env var, or a fixed tmp path.
const PROGRESS_FILE =
  process.env.BRIGHTCHAIN_PROGRESS_FILE ||
  path.join(os.tmpdir(), 'brightchain-test-progress.jsonl');

/**
 * Appends a single JSON line to the shared progress file.
 * Multiple Jest processes write concurrently; lines are small enough
 * to be atomic on local filesystems (well under PIPE_BUF / 4096 bytes).
 */
function emit(record) {
  try {
    fs.appendFileSync(PROGRESS_FILE, JSON.stringify(record) + '\n');
  } catch (_e) {
    // Non-fatal — progress display degrades gracefully
  }
}

class CustomReporter {
  constructor(globalConfig, options) {
    this._globalConfig = globalConfig;
    this._options = options;
  }

  /**
   * Fired once per Jest worker process when the run starts.
   * numTotalTestSuites is the count of suite files this worker will run.
   */
  onRunStart(results, _options) {
    emit({
      event: 'run_start',
      ts: Date.now(),
      numTotalSuites: results.numTotalTestSuites,
    });
  }

  /**
   * Fired after every individual test case (Jest 27+).
   * This is the high-resolution hook — one event per `it()`/`test()`.
   *
   * @param {import('@jest/types').Test.Test} test  - the suite file
   * @param {import('@jest/types').TestResult.AssertionResult} testCaseResult
   */
  onTestCaseResult(test, testCaseResult) {
    emit({
      event: 'test_case',
      ts: Date.now(),
      status: testCaseResult.status,           // 'passed' | 'failed' | 'skipped' | 'todo'
      duration: testCaseResult.duration ?? 0,  // ms
      fullName: testCaseResult.fullName,
      ancestorTitles: testCaseResult.ancestorTitles,
      suitePath: test.path,
      // First failure message only (keep lines small)
      failureMsg: testCaseResult.status === 'failed'
        ? (testCaseResult.failureMessages[0] || '').split('\n')[0]
        : undefined,
    });
  }

  /**
   * Fired after a whole suite file finishes.
   * We use this to capture the aggregated totals Jest tracks internally,
   * which gives the wrapper script a cross-check on the running counts.
   */
  onTestResult(test, testResult, aggregatedResult) {
    emit({
      event: 'suite_done',
      ts: Date.now(),
      suitePath: test.path,
      suitePass: testResult.testResults.filter(t => t.status === 'passed').length,
      suiteFail: testResult.testResults.filter(t => t.status === 'failed').length,
      suiteSkip: testResult.testResults.filter(t => t.status === 'skipped' || t.status === 'todo').length,
      // Jest's own running aggregate across all suites this process has seen
      aggPassedTests:  aggregatedResult.numPassedTests,
      aggFailedTests:  aggregatedResult.numFailedTests,
      aggTotalTests:   aggregatedResult.numTotalTests,
      aggPassedSuites: aggregatedResult.numPassedTestSuites,
      aggFailedSuites: aggregatedResult.numFailedTestSuites,
      aggTotalSuites:  aggregatedResult.numTotalTestSuites,
    });
  }

  onRunComplete(_contexts, _results) {
    emit({ event: 'run_complete', ts: Date.now() });
  }

  getLastError() {}
}

module.exports = CustomReporter;
