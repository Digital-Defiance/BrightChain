import type { PlatformID } from '@digitaldefiance/node-ecies-lib';
import { IApplication as IApplicationBase } from '@digitaldefiance/node-express-suite';
import { Environment } from '../environment';
import { DefaultBackendIdType } from '../shared-types';

export interface IApplication<
  TID extends PlatformID = DefaultBackendIdType,
> extends IApplicationBase<TID> {
  get environment(): Environment;
  get ready(): boolean;
  start(): Promise<void>;
}
