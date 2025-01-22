import {
  constants,
  ISignedToken,
  ITokenUser,
  TokenExpiredError,
  TokenInvalidError,
} from '@BrightChain/brightchain-lib';
import {
  JsonWebTokenError,
  JwtPayload,
  TokenExpiredError as JwtTokenExpiredError,
  sign,
  verify,
  VerifyOptions,
} from 'jsonwebtoken';
import { promisify } from 'util';
import { environment } from '../environment';
import { BaseService } from './base';

const verifyAsync = promisify<
  string,
  string | Buffer,
  VerifyOptions,
  JwtPayload | string
>(verify);

export class JwtService extends BaseService {
  /**
   * Sign a JWT token for a user
   * @param userDoc
   * @returns
   */
  public async signToken(userDoc: IUserDocument): Promise<ISignedToken> {
    if (!userDoc._id) {
      throw new Error('User ID is required to sign JWT token');
    }
    const tokenUser: ITokenUser = {
      userId: userDoc._id.toString(),
    };
    const token = sign(tokenUser, environment.jwtSecret, {
      algorithm: constants.JWT_ALGO,
      allowInsecureKeySizes: false,
      expiresIn: constants.JWT_EXPIRATION_SEC,
    });
    return {
      token,
      tokenUser,
    };
  }

  /**
   * Verify a JWT token and return the user data
   * @param token The JWT token
   * @returns The user data
   */
  public async verifyToken(token: string): Promise<ITokenUser> {
    try {
      const decoded = (await verifyAsync(token, environment.jwtSecret, {
        algorithms: [constants.JWT_ALGO],
      })) as JwtPayload;

      if (
        typeof decoded === 'object' &&
        decoded !== null &&
        'userId' in decoded
      ) {
        return {
          userId: decoded.userId as string,
        };
      }
    } catch (err) {
      if (err instanceof JwtTokenExpiredError) {
        throw new TokenExpiredError();
      } else if (err instanceof JsonWebTokenError) {
        throw err;
      }
    }
    throw new TokenInvalidError();
  }
}
