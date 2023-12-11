import {
  HanselGretelBreadCrumbTrail,
  IBreadCrumbTrace,
} from './HanselGretelBreadCrumbTrail';
const emitConsoleOnAdd = false;
describe('HanselGretelBreadCrumbTrail', () => {
  it('should trace', () => {
    const traceLog: Array<IBreadCrumbTrace> = [];
    const firstCrumb = HanselGretelBreadCrumbTrail.addCrumb(
      emitConsoleOnAdd,
      traceLog,
      'HanselGretelBreadCrumbTrail.spec.ts'
    );
    expect(firstCrumb.date).toBeDefined();
    expect(firstCrumb.IBreadCrumbTrace).toEqual(
      HanselGretelBreadCrumbTrail.IBreadCrumbTrace({
        date: firstCrumb.date,
        functionName: 'HanselGretelBreadCrumbTrail.spec.ts',
        functionArgs: [],
      })
    );
    const secondCrumb = firstCrumb.addCrumb('trace 1');
    expect(secondCrumb.IBreadCrumbTrace).toEqual(
      HanselGretelBreadCrumbTrail.IBreadCrumbTrace({
        date: secondCrumb.date,
        functionName: 'HanselGretelBreadCrumbTrail.spec.ts',
        functionArgs: ['trace 1'],
      })
    );
    expect(secondCrumb.date.getUTCMilliseconds()).toBeGreaterThanOrEqual(
      firstCrumb.date.getUTCMilliseconds()
    );
  });
  it('should trace deeper', () => {
    const traceLog: Array<IBreadCrumbTrace> = [];
    const firstCrumb = HanselGretelBreadCrumbTrail.addCrumb(
      emitConsoleOnAdd,
      traceLog,
      'HanselGretelBreadCrumbTrail.spec.ts'
    );
    expect(firstCrumb.date).toBeDefined();
    expect(firstCrumb.IBreadCrumbTrace).toEqual(
      HanselGretelBreadCrumbTrail.IBreadCrumbTrace({
        date: firstCrumb.date,
        functionName: 'HanselGretelBreadCrumbTrail.spec.ts',
        functionArgs: [],
      })
    );
    const forkedCrumb = firstCrumb.forkAndAddCrumb('trace 1', 'trace 2');
    expect(forkedCrumb.IBreadCrumbTrace).toEqual(
      HanselGretelBreadCrumbTrail.IBreadCrumbTrace({
        date: forkedCrumb.date,
        functionName: 'HanselGretelBreadCrumbTrail.spec.ts>trace 1',
        functionArgs: ['trace 2'],
      })
    );
    expect(forkedCrumb.date.getUTCMilliseconds()).toBeGreaterThanOrEqual(
      firstCrumb.date.getUTCMilliseconds()
    );
  });
  it('should trace with self logging callback', () => {
    const traceLog: Array<IBreadCrumbTrace> = [];
    const firstCrumb = HanselGretelBreadCrumbTrail.addCrumb(
      emitConsoleOnAdd,
      traceLog,
      'HanselGretelBreadCrumbTrail.spec.ts'
    );
    expect(firstCrumb.date).toBeDefined();
    expect(firstCrumb.IBreadCrumbTrace).toEqual(
      HanselGretelBreadCrumbTrail.IBreadCrumbTrace({
        date: firstCrumb.date,
        functionName: 'HanselGretelBreadCrumbTrail.spec.ts',
        functionArgs: [],
      })
    );
    const newTrace = 'trace 1';
    const newTraceCompleted = `${newTrace} callback completed`;
    const secondCrumb = firstCrumb.addCrumbWithCallback((crumbResult) => {
      expect(crumbResult.IBreadCrumbTrace).toEqual(
        HanselGretelBreadCrumbTrail.IBreadCrumbTrace({
          date: crumbResult.date,
          functionName: 'HanselGretelBreadCrumbTrail.spec.ts',
          functionArgs: [newTrace],
        })
      );
      return crumbResult.addCrumb(newTraceCompleted);
    }, newTrace);
    expect(secondCrumb.IBreadCrumbTrace).toEqual(
      HanselGretelBreadCrumbTrail.IBreadCrumbTrace({
        date: secondCrumb.date,
        functionName: 'HanselGretelBreadCrumbTrail.spec.ts',
        functionArgs: [newTraceCompleted],
      })
    );
  });
  it('should fork and trace with self logging callback', () => {
    const traceLog: Array<IBreadCrumbTrace> = [];
    const firstCrumb = HanselGretelBreadCrumbTrail.addCrumb(
      emitConsoleOnAdd,
      traceLog,
      'HanselGretelBreadCrumbTrail.spec.ts'
    );
    expect(firstCrumb.date).toBeDefined();
    expect(firstCrumb.IBreadCrumbTrace).toEqual(
      HanselGretelBreadCrumbTrail.IBreadCrumbTrace({
        date: firstCrumb.date,
        functionName: 'HanselGretelBreadCrumbTrail.spec.ts',
        functionArgs: [],
      })
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
          })
        );
        return crumbResult.addCrumb(newTraceCompleted);
      },
      newTrace
    );
    expect(secondCrumb.IBreadCrumbTrace).toEqual(
      HanselGretelBreadCrumbTrail.IBreadCrumbTrace({
        date: secondCrumb.date,
        functionName: 'HanselGretelBreadCrumbTrail.spec.ts>section 1',
        functionArgs: [newTraceCompleted],
      })
    );
  });
  it('should console log if enabled', () => {
    const traceLog: Array<IBreadCrumbTrace> = [];
    const originalConsoleLog = console.log;
    let logCount = 0;
    const logFunc = (...args: unknown[]) => {
      logCount++;
      //originalConsoleLog(args);
    };
    console.log = logFunc;
    let emit = false;
    HanselGretelBreadCrumbTrail.addCrumb(
      emit,
      traceLog,
      'HanselGretelBreadCrumbTrail.spec.ts'
    );
    //expect console.log not to have been called
    expect(logCount).toBe(0);
    emit = true;
    HanselGretelBreadCrumbTrail.addCrumb(
      emit,
      traceLog,
      'HanselGretelBreadCrumbTrail.spec.ts'
    );
    // expect console.log to have been called
    expect(logCount).toBe(1);
    console.log = originalConsoleLog;
  });
});
