
import {
  AggregatedResult,
  Reporter,
  TestContext,
} from '@jest/reporters';

class CustomReporter implements Reporter {
  private _totalTests = 0;
  private _testsCompleted = 0;
  private _startTime = 0;

  onRunStart(results: AggregatedResult): void {
    this._startTime = Date.now();
    this._totalTests = results.numTotalTests;
    console.log(`Found ${this._totalTests} tests.`);
    console.log('Starting test run...');
  }

  onTestResult(test: any, testResult: any, aggregatedResult: any): void {
    this._testsCompleted += testResult.testResults.length;
    const percentComplete = ((this._testsCompleted / this._totalTests) * 100).toFixed(2);
    const elapsedTime = (Date.now() - this._startTime) / 1000;
    const estimatedTime = (elapsedTime / this._testsCompleted) * (this._totalTests - this._testsCompleted);
    
    // Clear the console and print the progress
    console.clear();
    console.log(`Test Progress: ${this._testsCompleted}/${this._totalTests} (${percentComplete}%)`);
    console.log(`Elapsed Time: ${elapsedTime.toFixed(2)}s`);
    if (isFinite(estimatedTime)) {
      console.log(`Estimated Time Remaining: ${estimatedTime.toFixed(2)}s`);
    }
  }

  onRunComplete(contexts: Set<TestContext>, results: AggregatedResult): void {
    const endTime = Date.now();
    const duration = (endTime - this._startTime) / 1000;
    console.log(`\nTest run finished in ${duration.toFixed(2)}s.`);
    if (results.numFailedTests > 0) {
      console.error(`${results.numFailedTests} tests failed.`);
    } else {
      console.log('All tests passed!');
    }
  }

  getLastError(): Error | void {
    // This method is required, but we don't need to implement it for this use case.
  }
}

export default CustomReporter;
