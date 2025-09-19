import { IUserRoleBase } from '@brightchain/brightchain-lib';
import { DefaultBackendIdType } from '../shared-types';
import { IBaseDocument } from './base';

/**
 * Composite interface for user-role collection documents
 */
export type IUserRoleDocument = IBaseDocument<
  IUserRoleBase<DefaultBackendIdType, Date>,
  DefaultBackendIdType
>;
