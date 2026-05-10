import type { IdSerializer } from '../../collections/brightdb-helpers';

/**
 * String-passthrough IdSerializer for unit tests that use plain string IDs.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const mockIds: IdSerializer<any> = {
  idToString: (id: unknown) => String(id),
  parseId: (s: string) => s,
};
