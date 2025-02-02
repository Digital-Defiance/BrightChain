# HanselGretelBreadCrumbTrailSpec

## Overview

The `HanselGretelBreadCrumbTrailSpec` file contains unit tests for the `HanselGretelBreadCrumbTrail` class. These tests ensure the correctness and reliability of breadcrumb tracing functionality, including basic tracing, deeper tracing, self-logging callbacks, and console logging.

## File Definition

```typescript
import { BreadCrumbTraceLevel } from '../enumerations/breadCrumbTraceLevel';
import { IBreadCrumbContext } from '../interfaces/breadCrumbContext';
import { IBreadCrumbTrace } from '../interfaces/breadCrumbTrace';
import { HanselGretelBreadCrumbTrail } from './HanselGretelBreadCrumbTrail';

const emitConsoleOnAdd = false;

/**
 * Tests for the HanselGretelBreadCrumbTrail class.
 */
describe('HanselGretelBreadCrumbTrail', () => {
  let context: IBreadCrumbContext;
  let traceLog: Array<IBreadCrumbTrace>;

  beforeEach(() => {
    context = { category: 'test' };
    traceLog = [];
  });

  /**
   * Tests basic tracing functionality.
   */
  it('should trace', () => {
    const traceLog: Array<IBreadCrumbTrace> = [];
    const firstCrumb = HanselGretelBreadCrumbTrail.addCrumb(
      context,
      emitConsoleOnAdd,
      traceLog,
      'HanselGretelBreadCrumbTrail.spec.ts',
      BreadCrumbTraceLevel.Debug,
      1000,
    );
    expect(firstCrumb.date).toBeDefined();
    expect(firstCrumb.IBreadCrumbTrace).toEqual(
      HanselGretelBreadCrumbTrail.IBreadCrumbTrace({
        date: firstCrumb.date,
        functionName: 'HanselGretelBreadCrumbTrail.spec.ts',
        functionArgs: [],
      }),
    );
    const secondCrumb = firstCrumb.addCrumb('trace 1');
    expect(secondCrumb.IBreadCrumbTrace).toEqual(
      HanselGretelBreadCrumbTrail.IBreadCrumbTrace({
        date: secondCrumb.date,
        functionName: 'HanselGretelBreadCrumbTrail.spec.ts',
        functionArgs: ['trace 1'],
      }),
    );
    expect(secondCrumb.date.getUTCMilliseconds()).toBeGreaterThanOrEqual(
      firstCrumb.date.getUTCMilliseconds(),
    );
  });

  /**
   * Tests deeper tracing functionality.
   */
  it('should trace deeper', () => {
    const traceLog: Array<IBreadCrumbTrace> = [];
    const firstCrumb = HanselGretelBreadCrumbTrail.addCrumb(
      context,
      emitConsoleOnAdd,
      traceLog,
      'HanselGretelBreadCrumbTrail.spec.ts',
      BreadCrumbTraceLevel.Debug,
      1000,
    );
    expect(firstCrumb.date).toBeDefined();
    expect(firstCrumb.IBreadCrumbTrace).toEqual(
      HanselGretelBreadCrumbTrail.IBreadCrumbTrace({
        date: firstCrumb.date,
        functionName: 'HanselGretelBreadCrumbTrail.spec.ts',
        functionArgs: [],
      }),
    );
    const forkedCrumb = firstCrumb.forkAndAddCrumb('trace 1', 'trace 2');
    expect(forkedCrumb.IBreadCrumbTrace).toEqual(
      HanselGretelBreadCrumbTrail.IBreadCrumbTrace({
        date: forkedCrumb.date,
        functionName: 'HanselGretelBreadCrumbTrail.spec.ts>trace 1',
        functionArgs: ['trace 2'],
      }),
    );
    expect(forkedCrumb.date.getUTCMilliseconds()).toBeGreaterThanOrEqual(
      firstCrumb.date.getUTCMilliseconds(),
    );
  });

  /**
   * Tests tracing with a self-logging callback.
   */
  it('should trace with self logging callback', () => {
    const traceLog: Array<IBreadCrumbTrace> = [];
    const firstCrumb = HanselGretelBreadCrumbTrail.addCrumb(
      context,
      emitConsoleOnAdd,
      traceLog,
      'HanselGretelBreadCrumbTrail.spec.ts',
      BreadCrumbTraceLevel.Debug,
      1000,
    );
    expect(firstCrumb.date).toBeDefined();
    expect(firstCrumb.IBreadCrumbTrace).toEqual(
      HanselGretelBreadCrumbTrail.IBreadCrumbTrace({
        date: firstCrumb.date,
        functionName: 'HanselGretelBreadCrumbTrail.spec.ts',
        functionArgs: [],
      }),
    );
    const newTrace = 'trace 1';
    const newTraceCompleted = `${newTrace} callback completed`;
    const secondCrumb = firstCrumb.addCrumbWithCallback((crumbResult) => {
      expect(crumbResult.IBreadCrumbTrace).toEqual(
        HanselGretelBreadCrumbTrail.IBreadCrumbTrace({
          date: crumbResult.date,
          functionName: 'HanselGretelBreadCrumbTrail.spec.ts',
          functionArgs: [newTrace],
        }),
      );
      return crumbResult.addCrumb(newTraceCompleted);
    }, newTrace);
    expect(secondCrumb.IBreadCrumbTrace).toEqual(
      HanselGretelBreadCrumbTrail.IBreadCrumbTrace({
        date: secondCrumb.date,
        functionName: 'HanselGretelBreadCrumbTrail.spec.ts',
        functionArgs: [newTraceCompleted],
      }),
    );
  });

  /**
   * Tests forking and tracing with a self-logging callback.
   */
  it('should fork and trace with self logging callback', () => {
    const traceLog: Array<IBreadCrumbTrace> = [];
    const firstCrumb = HanselGretelBreadCrumbTrail.addCrumb(
      context,
      emitConsoleOnAdd,
      traceLog,
      'HanselGretelBreadCrumbTrail.spec.ts',
      BreadCrumbTraceLevel.Debug,
      1000,
    );
    expect(firstCrumb.date).toBeDefined();
    expect(firstCrumb.IBreadCrumbTrace).toEqual(
      HanselGretelBreadCrumbTrail.IBreadCrumbTrace({
        date: firstCrumb.date,
        functionName: 'HanselGretelBreadCrumbTrail.spec.ts',
        functionArgs: [],
      }),
    );
    const newSection = 'section 1';
    const newTrace = 'trace 1';
    const newTraceCompleted = `${newTrace} callback completed`;
    const secondCrumb = firstCrumb.forkAndAddCrumbWithCallback(
      newSection,
      (crumbResult) => {
        expect(crumbResult.IBreadCrumbTrace).toEqual(
          HanselGretelBreadCrumbTrail.IBreadCrumbTrace({
            date: crumbResult.date,
            functionName: 'HanselGretelBreadCrumbTrail.spec.ts>section 1',
            functionArgs: [newTrace],
          }),
        );
        return crumbResult.addCrumb(newTraceCompleted);
      },
      newTrace,
    );
    expect(secondCrumb.IBreadCrumbTrace).toEqual(
      HanselGretelBreadCrumbTrail.IBreadCrumbTrace({
        date: secondCrumb.date,
        functionName: 'HanselGretelBreadCrumbTrail.spec.ts>section 1',
        functionArgs: [newTraceCompleted],
      }),
    );
  });

  /**
   * Tests console logging functionality.
   */
  it('should console log if enabled', () => {
    const traceLog: Array<IBreadCrumbTrace> = [];
    const originalConsoleLog = console.log;
    const logFunc = jest.fn();
    console.log = logFunc;
    let emit = false;
    HanselGretelBreadCrumbTrail.addCrumb(
      context,
      emit,
      traceLog,
      'HanselGretelBreadCrumbTrail.spec.ts',
      BreadCrumbTraceLevel.Debug,
      1000,
    );
    //expect console.log not to have been called
    expect(logFunc).not.toHaveBeenCalled();
    emit = true;
    HanselGretelBreadCrumbTrail.addCrumb(
      context,
      emit,
      traceLog,
      'HanselGretelBreadCrumbTrail.spec.ts',
      BreadCrumbTraceLevel.Debug,
      1000,
    );
    // expect console.log to have been called
    expect(logFunc).toHaveBeenCalledTimes(1);
    console.log = originalConsoleLog;
  });

  /**
   * Tests handling of async operations.
   */
  it('should handle async operations', async () => {
    const asyncOperation = new Promise((resolve) =>
      setTimeout(() => resolve('done'), 100),
    );
    const breadcrumbTrail = new HanselGretelBreadCrumbTrail(
      context,
      false,
      traceLog,
      'asyncTest',
      BreadCrumbTraceLevel.Debug,
      10,
    );
    const resultTrail = await breadcrumbTrail.addCrumbAsync(asyncOperation);

    expect(resultTrail.traceLog.length).toBe(3);
    expect(resultTrail.traceLog[0].functionArgs).toEqual([]);
    expect(resultTrail.traceLog[1].functionArgs).toContain('start');
    expect(resultTrail.traceLog[2].functionArgs).toContain('complete');
  });

  /**
   * Tests memory management functionality.
   */
  it('should properly manage memory limits', () => {
    const maxEntries = 5;
    const breadcrumbTrail = new HanselGretelBreadCrumbTrail(
      context,
      false,
      traceLog,
      'memoryTest',
      BreadCrumbTraceLevel.Debug,
      maxEntries,
    );

    for (let i = 0; i < maxEntries + 2; i++) {
      breadcrumbTrail.addCrumb(`trace ${i}`);
    }

    expect(breadcrumbTrail.traceLog.length).toBe(maxEntries);
    expect(breadcrumbTrail.traceLog[0].functionArgs).toContain('trace 2');
  });

  /**
   * Tests trace filtering functionality.
   */
  it('should correctly filter traces', () => {
    const breadcrumbTrail = new HanselGretelBreadCrumbTrail(
      context,
      false,
      traceLog,
      'filterTest',
      BreadCrumbTraceLevel.Debug,
      10,
    );
    breadcrumbTrail.addCrumb('trace 1');
    breadcrumbTrail.addCrumb('trace 2');
    breadcrumbTrail.addCrumb('trace 3');

    const filteredCrumbs = breadcrumbTrail.findTraces({
      functionArgs: ['trace 2'],
    });
    expect(filteredCrumbs.length).toBe(1);
    expect(filteredCrumbs[0].functionArgs).toContain('trace 2');
  });
});
```

## Tests

### should trace

- **Purpose**: Tests basic tracing functionality.
- **Example**:
  ```typescript
  const traceLog: Array<IBreadCrumbTrace> = [];
  const firstCrumb = HanselGretelBreadCrumbTrail.addCrumb(
    context,
    emitConsoleOnAdd,
    traceLog,
    'HanselGretelBreadCrumbTrail.spec.ts',
    BreadCrumbTraceLevel.Debug,
    1000,
  );
  expect(firstCrumb.date).toBeDefined();
  expect(firstCrumb.IBreadCrumbTrace).toEqual(
    HanselGretelBreadCrumbTrail.IBreadCrumbTrace({
      date: firstCrumb.date,
      functionName: 'HanselGretelBreadCrumbTrail.spec.ts',
      functionArgs: [],
    }),
  );
  const secondCrumb = firstCrumb.addCrumb('trace 1');
  expect(secondCrumb.IBreadCrumbTrace).toEqual(
    HanselGretelBreadCrumbTrail.IBreadCrumbTrace({
      date: secondCrumb.date,
      functionName: 'HanselGretelBreadCrumbTrail.spec.ts',
      functionArgs: ['trace 1'],
    }),
  );
  expect(secondCrumb.date.getUTCMilliseconds()).toBeGreaterThanOrEqual(
    firstCrumb.date.getUTCMilliseconds(),
  );
  ```

### should trace deeper

- **Purpose**: Tests deeper tracing functionality.
- **Example**:
  ```typescript
  const traceLog: Array<IBreadCrumbTrace> = [];
  const firstCrumb = HanselGretelBreadCrumbTrail.addCrumb(
    context,
    emitConsoleOnAdd,
    traceLog,
    'HanselGretelBreadCrumbTrail.spec.ts',
    BreadCrumbTraceLevel.Debug,
    1000,
  );
  expect(firstCrumb.date).toBeDefined();
  expect(firstCrumb.IBreadCrumbTrace).toEqual(
    HanselGretelBreadCrumbTrail.IBreadCrumbTrace({
      date: firstCrumb.date,
      functionName: 'HanselGretelBreadCrumbTrail.spec.ts',
      functionArgs: [],
    }),
  );
  const forkedCrumb = firstCrumb.forkAndAddCrumb('trace 1', 'trace 2');
  expect(forkedCrumb.IBreadCrumbTrace).toEqual(
    HanselGretelBreadCrumbTrail.IBreadCrumbTrace({
      date: forkedCrumb.date,
      functionName: 'HanselGretelBreadCrumbTrail.spec.ts>trace 1',
      functionArgs: ['trace 2'],
    }),
  );
  expect(forkedCrumb.date.getUTCMilliseconds()).toBeGreaterThanOrEqual(
    firstCrumb.date.getUTCMilliseconds(),
  );
  ```

### should trace with self logging callback

- **Purpose**: Tests tracing with a self-logging callback.
- **Example**:
  ```typescript
  const traceLog: Array<IBreadCrumbTrace> = [];
  const firstCrumb = HanselGretelBreadCrumbTrail.addCrumb(
    context,
    emitConsoleOnAdd,
    traceLog,
    'HanselGretelBreadCrumbTrail.spec.ts',
    BreadCrumbTraceLevel.Debug,
    1000,
  );
  expect(firstCrumb.date).toBeDefined();
  expect(firstCrumb.IBreadCrumbTrace).toEqual(
    HanselGretelBreadCrumbTrail.IBreadCrumbTrace({
      date: firstCrumb.date,
      functionName: 'HanselGretelBreadCrumbTrail.spec.ts',
      functionArgs: [],
    }),
  );
  const newTrace = 'trace 1';
  const newTraceCompleted = `${newTrace} callback completed`;
  const secondCrumb = firstCrumb.addCrumbWithCallback((crumbResult) => {
    expect(crumbResult.IBreadCrumbTrace).toEqual(
      HanselGretelBreadCrumbTrail.IBreadCrumbTrace({
        date: crumbResult.date,
        functionName: 'HanselGretelBreadCrumbTrail.spec.ts',
        functionArgs: [newTrace],
      }),
    );
    return crumbResult.addCrumb(newTraceCompleted);
  }, newTrace);
  expect(secondCrumb.IBreadCrumbTrace).toEqual(
    HanselGretelBreadCrumbTrail.IBreadCrumbTrace({
      date: secondCrumb.date,
      functionName: 'HanselGretelBreadCrumbTrail.spec.ts',
      functionArgs: [newTraceCompleted],
    }),
  );
  ```

### should fork and trace with self logging callback

- **Purpose**: Tests forking and tracing with a self-logging callback.
- **Example**:
  ```typescript
  const traceLog: Array<IBreadCrumbTrace> = [];
  const firstCrumb = HanselGretelBreadCrumbTrail.addCrumb(
    context,
    emitConsoleOnAdd,
    traceLog,
    'HanselGretelBreadCrumbTrail.spec.ts',
    BreadCrumbTraceLevel.Debug,
    1000,
  );
  expect(firstCrumb.date).toBeDefined();
  expect(firstCrumb.IBreadCrumbTrace).toEqual(
    HanselGretelBreadCrumbTrail.IBreadCrumbTrace({
      date: firstCrumb.date,
      functionName: 'HanselGretelBreadCrumbTrail.spec.ts',
      functionArgs: [],
    }),
  );
  const newSection = 'section 1';
  const newTrace = 'trace 1';
  const newTraceCompleted = `${newTrace} callback completed`;
  const secondCrumb = firstCrumb.forkAndAddCrumbWithCallback(
    newSection,
    (crumbResult) => {
      expect(crumbResult.IBreadCrumbTrace).toEqual(
        HanselGretelBreadCrumbTrail.IBreadCrumbTrace({
          date: crumbResult.date,
          functionName: 'HanselGretelBreadCrumbTrail.spec.ts>section 1',
          functionArgs: [newTrace],
        }),
      );
      return crumbResult.addCrumb(newTraceCompleted);
    },
    newTrace,
  );
  expect(secondCrumb.IBreadCrumbTrace).toEqual(
    HanselGretelBreadCrumbTrail.IBreadCrumbTrace({
      date: secondCrumb.date,
      functionName: 'HanselGretelBreadCrumbTrail.spec.ts>section 1',
      functionArgs: [newTraceCompleted],
    }),
  );
  ```

### should console log if enabled

- **Purpose**: Tests console logging functionality.
- **Example**:
  ```typescript
  const traceLog: Array<IBreadCrumbTrace> = [];
  const originalConsoleLog = console.log;
  const logFunc = jest.fn();
  console.log = logFunc;
  let emit = false;
  HanselGretelBreadCrumbTrail.addCrumb(
    context,
    emit,
    traceLog,
    'HanselGretelBreadCrumbTrail.spec.ts',
    BreadCrumbTraceLevel.Debug,
    1000,
  );
  //expect console.log not to have been called
  expect(logFunc).not.toHaveBeenCalled();
  emit = true;
  HanselGretelBreadCrumbTrail.addCrumb(
    context,
    emit,
    traceLog,
    'HanselGretelBreadCrumbTrail.spec.ts',
    BreadCrumbTraceLevel.Debug,
    1000,
  );
  // expect console.log to have been called
  expect(logFunc).toHaveBeenCalledTimes(1);
  console.log = originalConsoleLog;
  ```

### should handle async operations

- **Purpose**: Tests handling of async operations.
- **Example**:

  ```typescript
  const asyncOperation = new Promise((resolve) =>
    setTimeout(() => resolve('done'), 100),
  );
  const breadcrumbTrail = new HanselGretelBreadCrumbTrail(
    context,
    false,
    traceLog,
    'asyncTest',
    BreadCrumbTraceLevel.Debug,
    10,
  );
  const resultTrail = await breadcrumbTrail.addCrumbAsync(asyncOperation);

  expect(resultTrail.traceLog.length).toBe(3);
  expect(resultTrail.traceLog[0].functionArgs).toEqual([]);
  expect(resultTrail.traceLog[1].functionArgs).toContain('start');
  expect(resultTrail.traceLog[2].functionArgs).toContain('complete');
  ```

### should properly manage memory limits

- **Purpose**: Tests memory management functionality.
- **Example**:

  ```typescript
  const maxEntries = 5;
  const breadcrumbTrail = new HanselGretelBreadCrumbTrail(
    context,
    false,
    traceLog,
    'memoryTest',
    BreadCrumbTraceLevel.Debug,
    maxEntries,
  );

  for (let i = 0; i < maxEntries + 2; i++) {
    breadcrumbTrail.addCrumb(`trace ${i}`);
  }

  expect(breadcrumbTrail.traceLog.length).toBe(maxEntries);
  expect(breadcrumbTrail.traceLog[0].functionArgs).toContain('trace 2');
  ```

### should correctly filter traces

- **Purpose**: Tests trace filtering functionality.
- **Example**:

  ```typescript
  const breadcrumbTrail = new HanselGretelBreadCrumbTrail(
    context,
    false,
    traceLog,
    'filterTest',
    BreadCrumbTraceLevel.Debug,
    10,
  );
  breadcrumbTrail.addCrumb('trace 1');
  breadcrumbTrail.addCrumb('trace 2');
  breadcrumbTrail.addCrumb('trace 3');

  const filteredCrumbs = breadcrumbTrail.findTraces({
    functionArgs: ['trace 2'],
  });
  expect(filteredCrumbs.length).toBe(1);
  expect(filteredCrumbs[0].functionArgs).toContain('trace 2');
  ```

## Conclusion

The `HanselGretelBreadCrumbTrailSpec` file provides comprehensive unit tests for the `HanselGretelBreadCrumbTrail` class, ensuring the correctness and reliability of breadcrumb tracing functionality.
