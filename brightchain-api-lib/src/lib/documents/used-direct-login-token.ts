import { IUsedDirectLoginTokenBase } from '@digitaldefiance/suite-core-lib';
import type { DefaultBackendIdType } from '../types/backend-id';
import { IBaseDocument } from './base';

export type IUsedDirectLoginTokenDocument = IBaseDocument<
  IUsedDirectLoginTokenBase<DefaultBackendIdType>
>;
