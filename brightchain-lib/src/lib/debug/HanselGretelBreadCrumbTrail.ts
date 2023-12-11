export interface IBreadCrumbTrace {
  readonly date: Date;
  readonly functionName: string;
  readonly functionArgs: Array<any>;
}

export class HanselGretelBreadCrumbTrail implements IBreadCrumbTrace {
  public readonly traceLog: Array<IBreadCrumbTrace>;
  public readonly date: Date;
  public readonly functionName: string;
  public readonly functionArgs: Array<any>;
  private readonly emitConsoleOnAdd: boolean;
  constructor(
    emitConsoleOnAdd: boolean,
    traceLog: Array<IBreadCrumbTrace>,
    functionName: string,
    ...args: Array<any>
  ) {
    this.date = new Date();
    this.functionName = functionName;
    this.functionArgs = args;
    this.traceLog = traceLog;
    this.emitConsoleOnAdd = emitConsoleOnAdd;
    this.addLogEntry();
  }
  private addLogEntry() {
    const breadCrumb = this.IBreadCrumbTrace;
    // give a nice place to add your debug statement below:
    this.traceLog.push(breadCrumb);
    if (this.emitConsoleOnAdd) {
      console.log(breadCrumb);
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
    emitConsoleOnAdd: boolean,
    traceLog: Array<IBreadCrumbTrace>,
    functionName: string,
    ...args: Array<any>
  ): HanselGretelBreadCrumbTrail {
    return new HanselGretelBreadCrumbTrail(
      emitConsoleOnAdd,
      traceLog,
      functionName,
      ...args
    );
  }
  public addCrumb(...args: Array<any>): HanselGretelBreadCrumbTrail {
    return new HanselGretelBreadCrumbTrail(
      this.emitConsoleOnAdd,
      this.traceLog,
      this.functionName,
      ...args
    );
  }
  public forkAndAddCrumb(
    functionName: string,
    ...args: Array<any>
  ): HanselGretelBreadCrumbTrail {
    return new HanselGretelBreadCrumbTrail(
      this.emitConsoleOnAdd,
      this.traceLog,
      [this.functionName, functionName].join('>'),
      ...args
    );
  }
  public addCrumbWithCallback(
    doCallback: (
      crumbResult: HanselGretelBreadCrumbTrail
    ) => HanselGretelBreadCrumbTrail,
    ...args: Array<any>
  ): HanselGretelBreadCrumbTrail {
    const newCrumb = this.addCrumb(...args);
    return doCallback(newCrumb);
  }
  public forkAndAddCrumbWithCallback(
    functionName: string,
    doCallback: (
      crumbResult: HanselGretelBreadCrumbTrail
    ) => HanselGretelBreadCrumbTrail,
    ...args: Array<any>
  ): HanselGretelBreadCrumbTrail {
    const newCrumb = this.forkAndAddCrumb(functionName, ...args);
    return doCallback(newCrumb);
  }
  public static IBreadCrumbTrace(trace: IBreadCrumbTrace): IBreadCrumbTrace {
    return trace;
  }
}
