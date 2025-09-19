import { ITokenRoleDTO } from '@brightchain/brightchain-lib';

/**
 * Interface for the user object stored in the JWT token
 */
export interface ITokenUser {
  userId: string;
  roles: ITokenRoleDTO[];
}
