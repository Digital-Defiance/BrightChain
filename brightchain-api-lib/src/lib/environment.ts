import { BrightDbEnvironment } from '@brightchain/node-express-suite';
import { HexString, SecureString } from '@digitaldefiance/ecies-lib';
import { PlatformID } from '@digitaldefiance/node-ecies-lib';
import {
  IConstants,
  IUpnpConfig,
  UpnpConfig,
} from '@digitaldefiance/node-express-suite';
import { join } from 'path';
import { Constants } from './constants';
import { EmailServices } from './enumerations/email-services';
import { IEnvironment } from './interfaces/environment';
import { IEnvironmentAws } from './interfaces/environment-aws';
import { DefaultBackendIdType } from './shared-types';

export class Environment<TID extends PlatformID = DefaultBackendIdType>
  extends BrightDbEnvironment<TID>
  implements IEnvironment<TID>
{
  private _upnp: IUpnpConfig;
  private _fontAwesomeKitId: string;
  private _aws: IEnvironmentAws;
  private _useTransactions: boolean;
  private _emailService: EmailServices;

  constructor(
    path?: string,
    initialization = false,
    override = true,
    constants: IConstants = Constants as unknown as IConstants,
  ) {
    super(path, initialization, override, constants);

    // Initialise _adminId from the value the parent constructor parsed/generated.
    // The override exists so that adminId is mutable (BaseEnvironment is read-only).
    this._adminId = super.adminId;

    const envObj = this.getObject();

    this._upnp = UpnpConfig.fromEnvironment(envObj);
    // BrightChain-specific environment variables
    this._fontAwesomeKitId = envObj['FONTAWESOME_KIT_ID'] ?? '';

    this._useTransactions = envObj['USE_TRANSACTIONS'] === 'true';

    this._aws = {
      accessKeyId: new SecureString(envObj['AWS_ACCESS_KEY_ID'] ?? null),
      secretAccessKey: new SecureString(
        envObj['AWS_SECRET_ACCESS_KEY'] ?? null,
      ),
      region: envObj['AWS_REGION'] ?? 'us-east-1',
    };

    const emailServiceRaw = (envObj['EMAIL_SERVICE'] ?? EmailServices.Fake)
      .toUpperCase()
      .trim();
    this._emailService = Object.values(EmailServices).includes(
      emailServiceRaw as EmailServices,
    )
      ? (emailServiceRaw as EmailServices)
      : EmailServices.Fake;

    // Override defaults if needed
    if (!envObj['JWT_SECRET']) {
      this.setEnvironment('jwtSecret', 'd!6!7al-6urnb46-s3cr3t!');
    }
    if (!envObj['EMAIL_SENDER']) {
      this.setEnvironment('emailSender', 'noreply@brightchain.org');
    }
    if (this.production) {
      this.setEnvironment('serverUrl', 'https://brightchain.org');
    }

    if (!envObj['API_DIST_DIR']) {
      this.setEnvironment(
        'apiDistDir',
        join(process.cwd(), 'dist', 'brightchain-api'),
      );
    }
    if (!envObj['REACT_DIST_DIR']) {
      this.setEnvironment(
        'reactDistDir',
        join(process.cwd(), 'dist', 'brightchain-react'),
      );
    }
  }

  /**
   * Use transactions for database operations (default: true)
   */
  public get useTransactions(): boolean {
    return this._useTransactions;
  }

  private _adminId: TID | undefined;
  /**
   * Admin ID (default: generated UUID)
   */
  public override get adminId(): TID | undefined {
    return this._adminId;
  }
  /**
   * Admin ID (default: generated UUID)
   */
  public override set adminId(value: TID | undefined) {
    this._adminId = value;
  }

  /**
   * ID adapter for converting byte arrays to IDs
   */
  public get idAdapter(): (bytes: Uint8Array) => HexString {
    return (bytes: Uint8Array) => {
      // Convert bytes to hex-based ID string; datastore layer owns actual ID type
      const hex = Buffer.from(bytes).toString('hex');
      return hex.slice(0, 24) as HexString;
    };
  }

  /**
   * UPnP Configuration
   * If set, UPnP will be used to automatically configure port forwarding
   * on compatible routers.
   */
  public get upnp(): IUpnpConfig {
    return this._upnp;
  }

  /**
   * The FontAwesome kit ID
   */
  public get fontAwesomeKitId(): string {
    return this._fontAwesomeKitId;
  }

  /**
   * AWS configuration
   */
  public get aws(): IEnvironmentAws {
    return this._aws;
  }

  /**
   * Email service to use for sending emails (default: EmailServices.Fake)
   */
  public get emailService(): EmailServices {
    return this._emailService;
  }
}
