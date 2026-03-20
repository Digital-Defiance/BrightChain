import {
  BrightChainFeatures,
  NodeIdSource,
} from '@brightchain/brightchain-lib';
import { BrightDbEnvironment } from '@brightchain/node-express-suite';
import {
  GuidV4Provider,
  HexString,
  SecureString,
} from '@digitaldefiance/ecies-lib';
import {
  PlatformID,
} from '@digitaldefiance/node-ecies-lib';
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
  private _enabledFeatures: BrightChainFeatures[];
  private _nodeId: string;
  private _nodeIdSource: NodeIdSource;

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

    const featureValues = Object.values(
      BrightChainFeatures,
    ) as BrightChainFeatures[];
    const featureLookup = new Map<string, BrightChainFeatures>(
      featureValues.map((v) => [v.toUpperCase(), v]),
    );

    const parsed = envObj['ENABLED_FEATURES']
      ?.split(',')
      .map((f: string) => featureLookup.get(f.trim().toUpperCase()))
      .filter((f): f is BrightChainFeatures => f !== undefined);

    this._enabledFeatures =
      parsed && parsed.length > 0
        ? parsed
        : [
            BrightChainFeatures.BrightChat,
            BrightChainFeatures.BrightHub,
            BrightChainFeatures.BrightMail,
            BrightChainFeatures.BrightPass,
          ];

    const emailServiceRaw = (envObj['EMAIL_SERVICE'] ?? EmailServices.Fake)
      .toUpperCase()
      .trim();
    this._emailService = Object.values(EmailServices).includes(
      emailServiceRaw as EmailServices,
    )
      ? (emailServiceRaw as EmailServices)
      : EmailServices.Fake;

    // Node identity resolution order:
    // 1. Explicit NODE_ID env var (validated via parseSafe)
    // 2. SYSTEM_ID env var (the node's cryptographic identity from the member system)
    // 3. Fall back to a fresh random GuidV4 (ephemeral, not persisted)
    const guidProvider = new GuidV4Provider();
    const rawNodeId = envObj['NODE_ID'];
    const parsedNodeId = rawNodeId
      ? guidProvider.parseSafe(rawNodeId)
      : undefined;
    if (rawNodeId && !parsedNodeId) {
      console.warn(
        `[ warning ] NODE_ID env var is not a valid GuidV4: "${rawNodeId}" — falling back to SYSTEM_ID or generating a new one`,
      );
    }

    if (parsedNodeId) {
      // NODE_ID env var is valid — use it directly
      this._nodeId = guidProvider.idToString(parsedNodeId);
      this._nodeIdSource = NodeIdSource.ENVIRONMENT;
    } else if (this.systemId) {
      // Derive node ID from the system user's identity (SYSTEM_ID)
      // Use guidProvider.serialize on the raw bytes rather than
      // getEnhancedNodeIdProvider() which requires
      // registerNodeRuntimeConfiguration() (not yet called).
      this._nodeId = guidProvider.serialize(
        guidProvider.toBytes(this.systemId as never),
      );
      this._nodeIdSource = NodeIdSource.SYSTEM_IDENTITY;
    } else {
      // No identity available — generate an ephemeral GuidV4
      const nodeIdGuid = guidProvider.fromBytes(guidProvider.generate());
      this._nodeId = guidProvider.idToString(nodeIdGuid);
      this._nodeIdSource = NodeIdSource.GENERATED;
      console.warn(
        '[ warning ] No NODE_ID or SYSTEM_ID available — using ephemeral generated node ID. ' +
          'Run inituserdb to establish a persistent node identity.',
      );
    }

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

  /**
   * The BrightChain features which are enabled in this instance
   */
  public get enabledFeatures(): BrightChainFeatures[] {
    return this._enabledFeatures;
  }

  /**
   * Unique identifier for this node in the BrightChain network.
   * Resolution order: NODE_ID env var → SYSTEM_ID → ephemeral GuidV4.
   */
  public get nodeId(): string {
    return this._nodeId;
  }

  /**
   * Indicates where the node ID was sourced from:
   * - `environment` — explicit NODE_ID env var
   * - `system_identity` — derived from SYSTEM_ID (the node's cryptographic identity)
   * - `generated` — ephemeral random GuidV4 (not persisted)
   */
  public get nodeIdSource(): NodeIdSource {
    return this._nodeIdSource;
  }
}
