/* eslint-disable no-undef, @typescript-eslint/no-namespace */
/// <reference types="jest" />

declare global {
  namespace jest {
    interface Matchers<R> {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      toThrowType<E extends Error, T extends new (...args: any[]) => E>(
        errorType: T,
        validator?: (error: E) => void,
      ): R;
    }
  }
}

declare module 'expect' {
  interface ExpectExtendMap {
    toThrowType: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      <E extends Error, T extends new (...args: any[]) => E>(
        this: jest.MatcherContext,
        received: () => unknown,
        errorType: T,
        validator?: (error: E) => void,
      ): jest.CustomMatcherResult;
    };
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ErrorClass<E extends Error> = new (...args: any[]) => E;
