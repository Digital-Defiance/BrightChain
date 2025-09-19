import {
  AccountStatus,
  AppConstants,
  IECIESConfig,
  InvalidCredentialsError,
  InvalidPasswordError,
  ModelName,
  SecureString,
  StringName,
  translate,
} from '@brightchain/brightchain-lib';
import { NextFunction, Request, Response } from 'express';
import { ClientSession } from 'mongoose';
import { BackendMember } from '../backendMember';
import { IUserDocument } from '../documents/user';
import { IApplication } from '../interfaces/application';
import { BackupCodeService } from '../services/backupCode';
import { ECIESService } from '../services/ecies';
import { EmailService } from '../services/email';
import { KeyWrappingService } from '../services/keyWrapping';
import { RoleService } from '../services/role';
import { UserService } from '../services/user';
import { withTransaction } from '../utils';

/**
 * Middleware to authenticate crypto operations requiring private key access
 * Expects mnemonic or password in request body for fresh authentication
 */
export async function authenticateCrypto(
  application: IApplication,
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<Response | void> {
  if (!req.user) {
    return res.status(401).send(translate(StringName.Validation_InvalidToken));
  }

  // Try validatedBody first (if validation has run), then fall back to raw body
  // Note: This middleware runs BEFORE validation, so validatedBody may not exist yet
  const validatedBody = (req as Request & { validatedBody?: unknown })
    .validatedBody as Record<string, unknown> | undefined;
  const rawBody = req.body as Record<string, unknown> | undefined;
  const sourceBody = validatedBody ?? rawBody;

  if (!sourceBody) {
    return res.status(400).send({
      message: translate(StringName.Validation_MnemonicOrPasswordRequired),
    });
  }

  const mnemonic =
    typeof sourceBody['mnemonic'] === 'string'
      ? (sourceBody['mnemonic'] as string)
      : undefined;
  const password =
    typeof sourceBody['password'] === 'string'
      ? (sourceBody['password'] as string)
      : undefined;
  if (!mnemonic && !password) {
    return res.status(400).send({
      message: translate(StringName.Validation_MnemonicOrPasswordRequired),
    });
  }
  const UserModel = application.getModel<IUserDocument>(ModelName.User);
  const config: IECIESConfig = {
    curveName: AppConstants.ECIES.CURVE_NAME,
    primaryKeyDerivationPath: AppConstants.ECIES.PRIMARY_KEY_DERIVATION_PATH,
    mnemonicStrength: AppConstants.ECIES.MNEMONIC_STRENGTH,
    symmetricAlgorithm: AppConstants.ECIES.SYMMETRIC_ALGORITHM_CONFIGURATION,
    symmetricKeyBits: AppConstants.ECIES.SYMMETRIC.KEY_BITS,
    symmetricKeyMode: AppConstants.ECIES.SYMMETRIC.MODE,
  };
  const keyWrappingService = new KeyWrappingService();

  const roleService = new RoleService(application);
  const userService = new UserService(
    application,
    roleService,
    new EmailService(application),
    keyWrappingService,
    new BackupCodeService(
      application,
      new ECIESService(config),
      keyWrappingService,
      roleService,
    ),
  );

  try {
    return await withTransaction<Response | void>(
      application.db.connection,
      application.environment.mongo.useTransactions,
      undefined,
      async (sess: ClientSession | undefined) => {
        const userDoc = await UserModel.findById(req.user!.id)
          .session(sess ?? null)
          .exec();

        if (!userDoc || userDoc.accountStatus !== AccountStatus.Active) {
          return res
            .status(403)
            .send(translate(StringName.Validation_UserNotFound));
        }

        // Ensure we're only authenticating the currently logged-in user
        if (userDoc._id.toString() !== req.user!.id) {
          return res
            .status(403)
            .send(translate(StringName.Validation_InvalidCredentials));
        }

        let loginResult: {
          userDoc: IUserDocument;
          userMember: BackendMember;
          adminMember: BackendMember;
        };

        if (mnemonic) {
          // Authenticate with mnemonic
          const userMnemonic = new SecureString(mnemonic);
          try {
            loginResult = await userService.loginWithMnemonic(
              userDoc.email,
              userMnemonic,
              sess,
            );
          } finally {
            userMnemonic.dispose();
          }
        } else if (password) {
          // Authenticate with password
          loginResult = await userService.loginWithPassword(
            userDoc.email,
            password,
            sess,
          );
        } else {
          // Should not happen due to earlier guard; keeps TypeScript happy
          return res.status(400).send({
            message: translate(
              StringName.Validation_MnemonicOrPasswordRequired,
            ),
          });
        }

        // Double-check authenticated user matches logged-in user
        if (loginResult.userDoc._id.toString() !== req.user!.id) {
          return res
            .status(403)
            .send(translate(StringName.Validation_InvalidCredentials));
        }

        // Attach the fully authenticated member (with private key) to the request
        req.burnbagUser = loginResult.userMember;
        // Do not attach the admin user to the request; it's a process-wide singleton
        // and must not be disposed as part of request cleanup.

        next();
        return;
      },
      {
        timeoutMs: application.environment.mongo.transactionTimeout,
      },
    );
  } catch (err) {
    if (
      err instanceof InvalidCredentialsError ||
      err instanceof InvalidPasswordError
    ) {
      console.error('Crypto authentication failed:', err.message, {
        userId: req.user?.id,
        hasPassword: !!password,
        hasMnemonic: !!mnemonic,
      });
      return res.status(401).send({
        message: translate(StringName.Validation_InvalidCredentials),
      });
    }
    console.error('Unexpected error in authenticateCrypto:', err);
    return res.status(500).send({
      message: translate(StringName.Common_UnexpectedError),
      error: err,
    });
  }
}
