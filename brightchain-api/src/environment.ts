import { constants } from '@BrightChain/brightchain-lib';
import { IEnvironment } from './interfaces/environment';

export class Environment implements IEnvironment {
  private readonly _environment: IEnvironment;
  private static _instance: Environment | undefined;
  public static get instance(): Environment {
    if (Environment._instance === undefined) {
      throw new TranslatableError(
        StringName.Admin_Error_EnvironmentNotInitialized,
      );
    }
    return Environment._instance;
  }
  constructor(path: string) {
    if (Environment._instance) {
      throw new TranslatableError(
        StringName.Admin_Error_EnvironmentAlreadyInitialized,
      );
    }
    console.log(
      translate(StringName.Admin_LoadingEnvironmentTemplate, {
        PATH: path,
      }),
    );
    const result = config({ path });

    if (result.error || !result.parsed) {
      throw new TranslatableError(
        StringName.Admin_Error_FailedToLoadEnvironment,
      );
    }

    this._environment = {
      jwtSecret: process.env.JWT_SECRET ?? '3?1g47(h@in!',
      fontawesomeKitId: process.env.FONTAWESOME_KIT_ID ?? '',
      sendgridKey: process.env.SENDGRID_API_KEY ?? '',
      emailSender: process.env.EMAIL_SENDER ?? constants.SITE.EMAIL_FROM,
      serverUrl: process.env.SERVER_URL ?? 'http://localhost:3000',
      developer: {
        debug: process.env.DEBUG === 'true',
        host: process.env.HOST ?? 'localhost',
        port: parseInt(process.env.PORT ?? '3000') ?? 3000,
        basePath: process.env.BASE_PATH ?? '/',
      },
    };
  }
  public get jwtSecret(): string {
    return this._environment.jwtSecret;
  }
  public get fontawesomeKitId(): string {
    return this._environment.fontawesomeKitId;
  }
  public get sendgridKey(): string {
    return this._environment.sendgridKey;
  }
  public get emailSender(): string {
    return this._environment.emailSender;
  }
  public get serverUrl(): string {
    return this._environment.serverUrl;
  }
  public get developer(): {
    debug: boolean;
    host: string;
    port: number;
    basePath: string;
  } {
    return this._environment.developer;
  }
}
