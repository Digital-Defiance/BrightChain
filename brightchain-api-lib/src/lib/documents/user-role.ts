import { IUserRoleBase } from '@digitaldefiance/suite-core-lib';
import { DefaultBackendIdType } from '../shared-types';
import { IBaseDocument } from './base';

/**
 * Composite interface for user-role collection documents
 */
export type IUserRoleDocument = IBaseDocument<
  IUserRoleBase<DefaultBackendIdType, Date>,
  DefaultBackendIdType
>;
