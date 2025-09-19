import {
  AccountStatus,
  GlobalActiveContext,
  ModelName,
  StringName,
  Timezone,
  translate,
} from '@brightchain/brightchain-lib';
import { NextFunction, Request, Response } from 'express';
import { IncomingHttpHeaders } from 'http';
import { ClientSession } from 'mongoose';
import { IUserDocument } from '../documents/user';
import { TokenExpiredError } from '../errors/token-expired';
import { IApplication } from '../interfaces/application';
import { ITokenUser } from '../interfaces/token-user';
import { JwtService } from '../services/jwt';
import { RequestUserService } from '../services/request-user';
import { RoleService } from '../services/role';
import { withTransaction } from '../utils';

/**
 * Find the auth token in the headers
 * @param headers The headers
 * @returns The auth token
 */
export function findAuthToken(headers: IncomingHttpHeaders): string | null {
  const authHeader = headers['Authorization'] || headers['authorization'];
  if (authHeader && typeof authHeader === 'string') {
    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
      return parts[1];
    }
  }
  return null;
}

/**
 * Middleware to authenticate a token
 * @param application The application
 * @param req The request
 * @param res The response
 * @param next The next function
 * @returns The response
 */
export async function authenticateToken(
  application: IApplication,
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<Response> {
  const UserModel = application.getModel<IUserDocument>(ModelName.User);
  const token = findAuthToken(req.headers);
  if (token == null) {
    return res.status(401).send(translate(StringName.Validation_InvalidToken));
  }

  try {
    return await withTransaction<Response>(
      application.db.connection,
      application.environment.mongo.useTransactions,
      undefined,
      async (sess: ClientSession | undefined) => {
        const jwtService: JwtService = new JwtService(application);
        const user: ITokenUser | null = await jwtService.verifyToken(token);
        if (user === null) {
          return res
            .status(403)
            .send(translate(StringName.Validation_UserNotFound));
        }
        const userDoc = await UserModel.findById(user.userId, {
          password: 0,
        })
          .session(sess ?? null)
          .exec();
        if (!userDoc || userDoc.accountStatus !== AccountStatus.Active) {
          return res
            .status(403)
            .send(translate(StringName.Validation_UserNotFound));
        }
        const roleService: RoleService = new RoleService(application);
        const roles = await roleService.getUserRoles(userDoc._id, sess);
        const tokenRoles = roleService.rolesToTokenRoles(roles);
        req.user = RequestUserService.makeRequestUserDTO(userDoc, tokenRoles);
        GlobalActiveContext.language =
          userDoc.siteLanguage ?? GlobalActiveContext.language;
        GlobalActiveContext.currentContext = 'user';
        GlobalActiveContext.timezone = new Timezone(userDoc.timezone);
        next();
        return res;
      },
      {
        timeoutMs: application.environment.mongo.transactionTimeout,
      },
    );
  } catch (err) {
    if (err instanceof TokenExpiredError) {
      return res.status(401).send({
        message: translate(StringName.Validation_TokenExpired),
        error: err,
      });
    } else if (err instanceof Error && err.name === 'JsonWebTokenError') {
      return res.status(400).send({
        message: translate(StringName.Validation_InvalidToken),
        error: err,
      });
    } else {
      return res.status(500).send({
        message: translate(StringName.Common_UnexpectedError),
        error: err,
      });
    }
  }
}
