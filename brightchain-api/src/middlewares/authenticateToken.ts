import {
  StringNames,
  TokenExpiredError,
  translate,
} from '@BrightChain/brightchain-lib';
import { NextFunction, Request, Response } from 'express';
import { IncomingHttpHeaders } from 'http';
import {
  JsonWebTokenError,
  TokenExpiredError as JWTTokenExpiredError,
} from 'jsonwebtoken';
import { environment } from '../environment';
import { IApplication } from '../interfaces/application';
import { JwtService } from '../services/jwt';
import { RequestUserService } from '../services/requestUser';

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
    return res.status(401).send('No token provided');
  }

  try {
    return await withTransaction<Response>(
      application.db.connection,
      environment.mongo.useTransactions,
      undefined,
      async (session: ClientSession) => {
        const jwtService: JwtService = new JwtService(application);
        const user = await jwtService.verifyToken(token);
        try {
          const userDoc = await UserModel.findById(user.userId, {
            password: 0,
          }).session(session);
          if (
            !userDoc ||
            userDoc.accountStatusType !== AccountStatusTypeEnum.Active
          ) {
            return res
              .status(403)
              .send(translate(StringNames.Error_UserNotFound));
          }
          req.user = RequestUserService.makeRequestUser(userDoc);
          next();
          return res;
        } catch (err) {
          return res
            .status(500)
            .send(translate(StringNames.Error_UnexpectedError));
        }
      },
    );
  } catch (err) {
    if (
      err instanceof TokenExpiredError ||
      err instanceof JWTTokenExpiredError
    ) {
      return res.status(401).send(translate(StringNames.Error_TokenExpired));
    } else if (err instanceof JsonWebTokenError) {
      return res.status(401).send(translate(StringNames.Error_TokenInvalid));
    } else {
      return res.status(500).send(translate(StringNames.Error_UnexpectedError));
    }
  }
}
