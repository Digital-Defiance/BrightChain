/* eslint-disable @typescript-eslint/no-explicit-any */
import { BreadCrumbTraceLevel } from '../enumerations/breadCrumbTraceLevel';
import { IBreadCrumbContext } from '../interfaces/breadCrumbContext';
import { IBreadCrumbTrace } from '../interfaces/breadCrumbTrace';

export class HanselGretelBreadCrumbTrail implements IBreadCrumbTrace {
  public readonly context: IBreadCrumbContext;
  public readonly traceLevel: BreadCrumbTraceLevel;
  public readonly traceLog: Array<IBreadCrumbTrace>;
  public readonly date: Date;
  public readonly functionName: string;
  public readonly functionArgs: ReadonlyArray<unknown>;
  public readonly emitConsoleOnAdd: boolean;
  public readonly maxEntries: number;
  constructor(
    context: IBreadCrumbContext,
    emitConsoleOnAdd: boolean,
    traceLog: Array<IBreadCrumbTrace>,
    functionName: string,
    traceLevel: BreadCrumbTraceLevel,
    maxEntries: number,
    ...args: ReadonlyArray<unknown>
  ) {
    this.date = new Date();
    this.context = context;
    this.functionName = functionName;
    this.functionArgs = args;
    this.traceLog = traceLog;
    this.emitConsoleOnAdd = emitConsoleOnAdd;
    this.traceLevel = traceLevel;
    this.maxEntries = maxEntries;
    this.addLogEntry();
  }
  private addLogEntry() {
    const breadCrumb = this.IBreadCrumbTrace;
    if (this.traceLog.length >= this.maxEntries) {
      this.traceLog.shift(); // Remove oldest entry
    }
    this.traceLog.push(breadCrumb);
    if (this.emitConsoleOnAdd) {
      console.log(
        JSON.stringify(
          {
            timestamp: this.date.toISOString(),
            level: this.traceLevel,
            function: this.functionName,
            args: this.functionArgs,
            context: this.context,
          },
          null,
          2,
        ),
      );
    }
  }
  public get IBreadCrumbTrace(): IBreadCrumbTrace {
    return {
      date: this.date,
      functionName: this.functionName,
      functionArgs: this.functionArgs,
    } as IBreadCrumbTrace;
  }
  public static addCrumb(
    context: IBreadCrumbContext,
    emitConsoleOnAdd: boolean,
    traceLog: Array<IBreadCrumbTrace>,
    functionName: string,
    traceLevel: BreadCrumbTraceLevel,
    maxEntries: number,
    ...args: Array<unknown>
  ): HanselGretelBreadCrumbTrail {
    return new HanselGretelBreadCrumbTrail(
      context,
      emitConsoleOnAdd,
      traceLog,
      functionName,
      traceLevel,
      maxEntries,
      ...args,
    );
  }
  public addCrumb(...args: Array<unknown>): HanselGretelBreadCrumbTrail {
    return new HanselGretelBreadCrumbTrail(
      this.context,
      this.emitConsoleOnAdd,
      this.traceLog,
      this.functionName,
      this.traceLevel,
      this.maxEntries,
      ...args,
    );
  }
  public async addCrumbAsync(
    asyncOperation: Promise<any>,
    ...args: Array<unknown>
  ): Promise<HanselGretelBreadCrumbTrail> {
    const startCrumb = this.addCrumb('start', ...args);
    try {
      const result = await asyncOperation;
      return startCrumb.addCrumb('complete', result);
    } catch (error) {
      return startCrumb.addCrumb('error', error);
    }
  }
  public forkAndAddCrumb(
    functionName: string,
    ...args: Array<unknown>
  ): HanselGretelBreadCrumbTrail {
    return new HanselGretelBreadCrumbTrail(
      this.context,
      this.emitConsoleOnAdd,
      this.traceLog,
      [this.functionName, functionName].join('>'),
      this.traceLevel,
      this.maxEntries,
      ...args,
    );
  }
  public addCrumbWithCallback(
    doCallback: (
      crumbResult: HanselGretelBreadCrumbTrail,
    ) => HanselGretelBreadCrumbTrail,
    ...args: Array<unknown>
  ): HanselGretelBreadCrumbTrail {
    const newCrumb = this.addCrumb(...args);
    return doCallback(newCrumb);
  }
  public forkAndAddCrumbWithCallback(
    functionName: string,
    doCallback: (
      crumbResult: HanselGretelBreadCrumbTrail,
    ) => HanselGretelBreadCrumbTrail,
    ...args: Array<unknown>
  ): HanselGretelBreadCrumbTrail {
    const newCrumb = this.forkAndAddCrumb(functionName, ...args);
    return doCallback(newCrumb);
  }
  public static IBreadCrumbTrace(trace: IBreadCrumbTrace): IBreadCrumbTrace {
    return trace;
  }
  public clearTrace(): void {
    this.traceLog.length = 0;
  }

  public pruneOldEntries(maxAge: number): void {
    const now = new Date();
    // Iterate backwards to avoid issues with index shifting when removing elements
    for (let i = this.traceLog.length - 1; i >= 0; i--) {
      if (now.getTime() - this.traceLog[i].date.getTime() > maxAge) {
        this.traceLog.splice(i, 1);
      }
    }
  }
  public exportTrace(format: 'json' | 'csv'): string {
    switch (format) {
      case 'json':
        return JSON.stringify(this.traceLog, null, 2);
      case 'csv':
        return this.formatAsCSV();
      default:
        throw new Error('Unsupported format');
    }
  }
  private formatAsCSV(): string {
    const headers = Object.keys(this.traceLog[0]).join(',');
    const rows = this.traceLog
      .map((trace) => Object.values(trace).join(','))
      .join('\n');
    return `${headers}\n${rows}`;
  }

  private isEqual(value: any, other: any): boolean {
    if (value === other) {
      return true;
    }

    if (
      typeof value !== 'object' ||
      value === null ||
      typeof other !== 'object' ||
      other === null
    ) {
      return false;
    }

    const keysA = Object.keys(value);
    const keysB = Object.keys(other);

    if (keysA.length !== keysB.length) {
      return false;
    }

    for (const key of keysA) {
      if (!keysB.includes(key) || !this.isEqual(value[key], other[key])) {
        return false;
      }
    }

    return true;
  }

  public findTraces(
    criteria: Partial<IBreadCrumbTrace>,
  ): Array<IBreadCrumbTrace> {
    return this.traceLog.filter((trace) =>
      Object.entries(criteria).every(([key, value]) => {
        const traceValue = trace[key as keyof IBreadCrumbTrace];
        if (Array.isArray(traceValue)) {
          return this.isEqual(traceValue, value);
        }
        return traceValue === value;
      }),
    );
  }
}
