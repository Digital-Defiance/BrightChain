import { IRoleDTO, IRoleFrontendObject } from '@digitaldefiance/suite-core-lib';
import { Types } from 'mongoose';
import { IRoleBackendObject } from './backend-objects/role';

export type StringLanguage = string;

/**
 * Interface for the user object stored in the request object
 * This is not used for mongoose but for request handling
 */
export interface IRequestUser<
  I extends Types.ObjectId | string = string,
  R extends
    | Array<IRoleDTO>
    | Array<IRoleFrontendObject>
    | Array<IRoleBackendObject> = Array<IRoleDTO>,
  S extends StringLanguage | string = string,
  D extends Date | string = string,
> {
  /**
   * The ID of the user
   */
  id: I;
  /**
   * The roles associated with the user
   */
  roles: R;
  /**
   * The username of the user
   */
  username: string;
  /**
   * The email address of the user
   */
  email: string;
  /**
   * How long to keep the mnemonic in memory (in seconds)
   */
  expireMemoryMnemonicSeconds?: number;
  /**
   * How long to keep the wallet in memory (in seconds)
   */
  expireMemoryWalletSeconds?: number;
  /**
   * The timezone of the user
   */
  timezone: string;
  /**
   * The language of the user
   */
  siteLanguage: S;
  /**
   * The date the user last logged in
   */
  lastLogin?: D;
  /**
   * Whether the user has verified their email address
   */
  emailVerified: boolean;
}
