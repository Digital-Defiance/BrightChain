/* eslint-disable @typescript-eslint/no-explicit-any */
// Database-agnostic error interface (was mongoose-specific)
export interface IMongoErrors {
  [key: string]: { message: string; name: string; path?: string; value?: any };
}
