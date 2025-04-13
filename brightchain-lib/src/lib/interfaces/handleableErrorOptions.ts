export interface HandleableErrorOptions {
  cause: Error;
  handled: boolean;
  statusCode: number;
  sourceData: unknown;
}
