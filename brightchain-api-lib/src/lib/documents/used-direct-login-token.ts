import { IUsedDirectLoginTokenBase } from '@digitaldefiance/suite-core-lib';
import { DefaultBackendIdType } from '../shared-types';
import { IBaseDocument } from './base';

export type IUsedDirectLoginTokenDocument = IBaseDocument<
  IUsedDirectLoginTokenBase<DefaultBackendIdType>
>;
