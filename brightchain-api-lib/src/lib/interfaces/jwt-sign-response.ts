import { ITokenRole, ITokenRoleDTO } from '@digitaldefiance/suite-core-lib';
import type { DefaultBackendIdType } from '../types/backend-id';
import { ITokenUser } from './token-user';

export interface IJwtSignResponse {
  token: string;
  tokenUser: ITokenUser;
  roleNames: string[];
  roleTranslatedNames: string[];
  roles: ITokenRole<DefaultBackendIdType>[];
  roleDTOs: ITokenRoleDTO[];
}
