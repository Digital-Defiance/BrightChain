import {
  AppConstants,
  ITokenRole,
  ITokenRoleDTO,
  StringLanguage,
} from '@brightchain/brightchain-lib';
import {
  JsonWebTokenError,
  JwtPayload,
  TokenExpiredError as JwtTokenExpiredError,
  sign,
  verify,
  VerifyOptions,
} from 'jsonwebtoken';
import { promisify } from 'util';
import { IUserDocument } from '../documents/user';
import { InvalidJwtTokenError } from '../errors/invalid-jwt-token';
import { TokenExpiredError as DigitalBurnbagTokenExpiredError } from '../errors/token-expired';
import { IApplication } from '../interfaces/application';
import { IJwtSignResponse } from '../interfaces/jwt-sign-response';
import { ITokenUser } from '../interfaces/token-user';
import { DefaultBackendIdType } from '../shared-types';
import { BaseService } from './base';
import { RoleService } from './role';

const verifyAsync = promisify<
  string,
  string | Buffer,
  VerifyOptions,
  JwtPayload | string
>(verify);

export class JwtService extends BaseService {
  private readonly roleService: RoleService;

  /**
   * Constructor for the JWT service
   * @param application The application object
   */
  constructor(application: IApplication) {
    super(application);
    this.roleService = new RoleService(application);
  }

  /**
   * Sign a JWT token for a user
   * @param userDoc The user document to sign the token for
   * @param jwtSecret The secret to sign the token with
   * @param overrideLanguage Optional language to use for role translations
   * @returns The signed token
   */
  public async signToken(
    userDoc: IUserDocument,
    jwtSecret: string,
    overrideLanguage?: StringLanguage,
  ): Promise<IJwtSignResponse> {
    // look for roles the user is a member of (the role contains the user id in the user's roles array)
    const roles = await this.roleService.getUserRoles(userDoc._id);
    const tokenRoles: Array<ITokenRole<DefaultBackendIdType>> =
      this.roleService.rolesToTokenRoles(roles, overrideLanguage);
    const tokenRoleDTOs = tokenRoles.map((role) =>
      RoleService.roleToRoleDTO(role),
    );
    const roleTranslatedNames = tokenRoles.map((role) => role.translatedName);
    const roleNames = tokenRoles.map((role) => role.name);
    const tokenUser: ITokenUser = {
      userId: userDoc._id.toString(),
      roles: tokenRoleDTOs,
    };
    const token = sign(tokenUser, jwtSecret, {
      algorithm: AppConstants.JWT.ALGORITHM,
      allowInsecureKeySizes: false,
      expiresIn: AppConstants.JWT.EXPIRATION_SEC,
    });
    return {
      token,
      tokenUser,
      roleNames,
      roleTranslatedNames,
      roles: tokenRoles,
      roleDTOs: tokenRoleDTOs,
    };
  }

  /**
   * Verify a JWT token and return the user data
   * @param token The token to verify
   * @returns The user data
   * @throws InvalidTokenError
   */
  public async verifyToken(token: string): Promise<ITokenUser | null> {
    try {
      const decoded = (await verifyAsync(
        token,
        this.application.environment.jwtSecret,
        {
          algorithms: [AppConstants.JWT.ALGORITHM],
        },
      )) as JwtPayload;

      if (
        typeof decoded === 'object' &&
        decoded !== null &&
        'userId' in decoded &&
        'roles' in decoded
      ) {
        return {
          userId: decoded['userId'] as string,
          roles: decoded['roles'] as ITokenRoleDTO[],
        };
      } else {
        return null;
      }
    } catch (err) {
      if (err instanceof JwtTokenExpiredError) {
        throw new DigitalBurnbagTokenExpiredError();
      } else if (err instanceof JsonWebTokenError) {
        throw err;
      }
      throw new InvalidJwtTokenError();
    }
  }
}
