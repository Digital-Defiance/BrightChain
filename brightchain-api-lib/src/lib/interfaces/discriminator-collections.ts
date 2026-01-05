/* eslint-disable @typescript-eslint/no-explicit-any */
// Database-agnostic discriminator collection holder
export interface IDiscriminatorCollections<T = unknown> {
  byType: Record<string, T>;
  array: Array<T>;
}
