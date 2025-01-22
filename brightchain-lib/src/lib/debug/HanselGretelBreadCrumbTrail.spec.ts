import { BreadCrumbTraceLevel } from '../enumerations/breadCrumbTraceLevel';
import { IBreadCrumbContext } from '../interfaces/breadCrumbContext';
import { IBreadCrumbTrace } from '../interfaces/breadCrumbTrace';
import { HanselGretelBreadCrumbTrail } from './HanselGretelBreadCrumbTrail';
const emitConsoleOnAdd = false;
describe('HanselGretelBreadCrumbTrail', () => {
  let context: IBreadCrumbContext;
  let traceLog: Array<IBreadCrumbTrace>;

  beforeEach(() => {
    context = { category: 'test' };
    traceLog = [];
  });

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
