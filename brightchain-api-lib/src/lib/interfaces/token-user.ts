import { ITokenRoleDTO } from '@digitaldefiance/suite-core-lib';

/**
 * Interface for the user object stored in the JWT token
 */
export interface ITokenUser {
  userId: string;
  roles: ITokenRoleDTO[];
}
