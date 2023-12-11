export interface IBreadCrumbTrace {
  readonly date: Date;
  readonly functionName: string;
  readonly functionArgs: ReadonlyArray<unknown>;
}
