import { IRoleBase } from '@digitaldefiance/suite-core-lib';
import type { DefaultBackendIdType } from '../types/backend-id';
import { IBaseDocument } from './base';

/**
 * Composite interface for role collection documents
 */
export type IRoleDocument = IBaseDocument<
  IRoleBase<DefaultBackendIdType, Date>,
  DefaultBackendIdType
>;
