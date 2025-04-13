import { IRoleBase } from '@digitaldefiance/suite-core-lib';
import { DefaultBackendIdType } from '../shared-types';
import { IBaseDocument } from './base';

/**
 * Composite interface for role collection documents
 */
export type IRoleDocument = IBaseDocument<
  IRoleBase<DefaultBackendIdType, Date>,
  DefaultBackendIdType
>;
