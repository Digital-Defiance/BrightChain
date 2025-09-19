import { ITokenRole, ITokenRoleDTO } from '@brightchain/brightchain-lib';
import { DefaultBackendIdType } from '../shared-types';
import { ITokenUser } from './token-user';

export interface IJwtSignResponse {
  token: string;
  tokenUser: ITokenUser;
  roleNames: string[];
  roleTranslatedNames: string[];
  roles: ITokenRole<DefaultBackendIdType>[];
  roleDTOs: ITokenRoleDTO[];
}
