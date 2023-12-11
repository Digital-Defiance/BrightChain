import {
  DriverBackedHeadRegistry,
  IHeadRegistry,
} from '@brightchain/brightchain-lib';
import { CloudHeadRegistryDriver } from './cloudHeadRegistryDriver';

/**
 * Factory that creates a DriverBackedHeadRegistry using cloud primitives.
 *
 * Drop-in replacement for `new CloudHeadRegistry(...)`.  Each head pointer is
 * stored as an independent JSON object in the cloud container rather than
 * being serialised into a single monolithic blob, giving O(1) per-key writes.
 *
 * @param options Same shape as CloudHeadRegistry options — existing call sites
 *   need no changes other than using this factory instead.
 */
export function createCloudHeadRegistry(options: {
  uploadObject: (key: string, data: Uint8Array) => Promise<void>;
  downloadObject: (key: string) => Promise<Uint8Array>;
  objectExists: (key: string) => Promise<boolean>;
  deleteObject: (key: string) => Promise<void>;
  listObjects: (prefix: string, maxResults?: number) => Promise<string[]>;
  namespace?: string;
}): IHeadRegistry {
  const driver = new CloudHeadRegistryDriver(options);
  return new DriverBackedHeadRegistry(driver);
}
