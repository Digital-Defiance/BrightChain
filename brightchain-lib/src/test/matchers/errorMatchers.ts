import { expect } from '@jest/globals';
import type { MatcherContext } from 'expect';
import { readFileSync } from 'fs';
import type { ErrorClass } from '../types/jest';

interface MatcherError extends Error {
  matcherResult?: {
    expected: unknown;
    received: unknown;
  };
}

function isMatcherError(error: unknown): error is MatcherError {
  return error instanceof Error && 'matcherResult' in error;
}

function extractTestInfo(stackTrace: string) {
  const stackLines = stackTrace.split('\n');
  const anonymousLine = stackLines.find((line) =>
    line.includes('Object.<anonymous>'),
  );
  const match = anonymousLine?.match(/\((.+?\.spec\.ts):(\d+):(\d+)\)/);

  if (!match) {
    return { testHierarchy: ['Unknown Test'], location: '' };
  }

  const fullTestPath = match[1];
  const lineNumber = parseInt(match[2]);
  const testFile = fullTestPath.split('/').pop() || '';

  try {
    const fileContent = readFileSync(fullTestPath, 'utf8');
    const lines = fileContent.split('\n');
    const testLineContent = lines[lineNumber - 1];
    const testNameMatch = testLineContent.match(/it\(['"](.+?)['"]/);
    const testName = testNameMatch?.[1];

    const testHierarchy = ['BlockCapacityCalculator', 'calculateCapacity'];
    if (testName) {
      testHierarchy.push(testName);
    }

    return {
      testHierarchy,
      location: ` (${testFile}:${lineNumber})`,
    };
  } catch {
    return {
      testHierarchy: ['BlockCapacityCalculator', 'calculateCapacity'],
      location: ` (${testFile}:${lineNumber})`,
    };
  }
}

export const toThrowType = async function <E extends Error>(
  this: MatcherContext,
  received: (() => unknown | Promise<unknown>) | Promise<unknown>,
  errorType: ErrorClass<E>,
  validator?: (error: E) => void,
): Promise<jest.CustomMatcherResult> {
  const matcherName = 'toThrowType';
  const options = {
    isNot: this.isNot,
    promise: this.promise,
  };

  let error: unknown;
  let pass = false;

  try {
    if (this.promise) {
      // For .rejects case, handle the promise directly
      try {
        await received;
        pass = false;
      } catch (e) {
        error = e;
        if (
          error instanceof Error &&
          (error instanceof errorType || error.constructor === errorType)
        ) {
          pass = true;
          if (validator) {
            await validator(error as E);
          }
        }
      }
    } else {
      // Handle direct function call case
      if (typeof received !== 'function') {
        throw new Error(
          this.utils.matcherHint(matcherName, undefined, undefined, options) +
            '\n\n' +
            'Received value must be a function',
        );
      }
      try {
        await (received as () => unknown | Promise<unknown>)();
        pass = false;
      } catch (e) {
        error = e;
        if (
          error instanceof Error &&
          (error instanceof errorType || error.constructor === errorType)
        ) {
          pass = true;
          if (validator) {
            await validator(error as E);
          }
        }
      }
    }
  } catch (validatorError) {
    // If we get here, the validator threw an error
    const error =
      validatorError instanceof Error
        ? validatorError
        : new Error(String(validatorError));
    const message = error.message;
    const stack = error.stack || '';

    let diffString: string;
    if (isMatcherError(error) && error.matcherResult) {
      diffString =
        this.utils.diff(
          error.matcherResult.expected,
          error.matcherResult.received,
        ) || '';
    } else {
      diffString = this.utils.diff('Error to match assertions', message) || '';
    }

    const { testHierarchy, location } = extractTestInfo(stack);

    return {
      pass: false,
      message: () =>
        `\n\n${this.utils.RECEIVED_COLOR(`● ${testHierarchy.join(' › ')}${location ? ` ${location}` : ''}`)}\n\n` +
        this.utils.matcherHint(matcherName, undefined, undefined, options) +
        '\n\n' +
        diffString +
        '\n\n' +
        (stack
          ? this.utils.RECEIVED_COLOR(stack.split('\n').slice(1).join('\n'))
          : ''),
    };
  }

  const testHeader =
    error instanceof Error && error.stack
      ? (() => {
          const { testHierarchy, location } = extractTestInfo(error.stack);
          return `\n\n${this.utils.RECEIVED_COLOR(`● ${testHierarchy.join(' › ')}${location}`)}\n\n`;
        })()
      : '\n';

  return {
    pass,
    message: () =>
      testHeader +
      this.utils.matcherHint(matcherName, undefined, undefined, options) +
      '\n\n' +
      (pass
        ? `Expected function not to throw ${this.utils.printExpected(errorType.name)}`
        : this.promise
          ? this.utils.matcherErrorMessage(
              this.utils.matcherHint(
                matcherName,
                undefined,
                undefined,
                options,
              ),
              'Expected promise to reject',
              'Promise resolved successfully',
            )
          : this.utils.matcherErrorMessage(
              this.utils.matcherHint(
                matcherName,
                undefined,
                undefined,
                options,
              ),
              `Expected function to throw ${this.utils.printExpected(errorType.name)}`,
              `Received: ${this.utils.printReceived(
                error instanceof Error ? error.constructor.name : typeof error,
              )}`,
            )),
  };
};

expect.extend({ toThrowType });
