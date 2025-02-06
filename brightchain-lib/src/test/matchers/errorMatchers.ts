import { expect } from '@jest/globals';
import type { MatcherContext } from 'expect';
import type { ErrorClass } from '../types/jest';

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
        if (error instanceof Error && error.constructor === errorType) {
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
        if (error instanceof Error && error.constructor === errorType) {
          pass = true;
          if (validator) {
            await validator(error as E);
          }
        }
      }
    }
  } catch (validatorError) {
    // If we get here, the validator threw an error
    return {
      pass: false,
      message: () =>
        `Expected error to match assertions but failed: ${
          validatorError instanceof Error
            ? validatorError.message
            : String(validatorError)
        }`,
    };
  }

  return {
    pass,
    message: () =>
      this.utils.matcherHint(matcherName, undefined, undefined, options) +
      '\n\n' +
      (pass
        ? `Expected function not to throw ${errorType.name}`
        : this.promise
          ? 'Expected promise to reject but it resolved successfully'
          : `Expected function to throw ${errorType.name} but got ${
              error instanceof Error ? error.constructor.name : typeof error
            }`),
  };
};

expect.extend({ toThrowType });
