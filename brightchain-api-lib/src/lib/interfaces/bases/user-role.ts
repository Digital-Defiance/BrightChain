import { IUserRoleBase } from '@brightchain/brightchain-lib';
import { DefaultBackendIdType } from '../../shared-types';

export type IUserRoleBackend = IUserRoleBase<DefaultBackendIdType, Date>;
