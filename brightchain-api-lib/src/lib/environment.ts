import {
  BrightChainFeatures,
  CONSTANTS,
  NodeIdSource,
} from '@brightchain/brightchain-lib';
import { BrightDbEnvironment } from '@brightchain/node-express-suite';
import {
  GuidV4Provider,
  HexString,
  SecureString,
} from '@digitaldefiance/ecies-lib';
import { PlatformID } from '@digitaldefiance/node-ecies-lib';
import {
  IConstants,
  IUpnpConfig,
  UpnpConfig,
} from '@digitaldefiance/node-express-suite';
import { join, resolve } from 'path';
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
  private _ejsSplashRoot: string | undefined;
  private _splashTemplatePath: string | undefined;
  private _gtagId: string | undefined;
  private _assetsEnabled: boolean;
  private _jouleEnabled: boolean;
  private _burnbagJouleEnabled: boolean;
  private _profileLength: number;
  private _profilePinnedPostEnabled: boolean;
  private _brightHubFontAwesomeMaxDisplay: number;
  private _brightHubFontAwesomeIconGridSize: number;
  private _brightChatFontAwesomeMaxDisplay: number;
  private _brightChatFontAwesomeIconGridSize: number;
  private _gatewayEnabled: boolean;

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

    // EJS splash page configuration
    const rawEjsSplashRoot = envObj['EJS_SPLASH_ROOT'];
    const rawSplashTemplatePath = envObj['SPLASH_TEMPLATE_PATH'];

    this._ejsSplashRoot = rawEjsSplashRoot
      ? resolve(process.cwd(), rawEjsSplashRoot)
      : undefined;

    this._splashTemplatePath = rawSplashTemplatePath
      ? resolve(process.cwd(), rawSplashTemplatePath)
      : undefined;

    if (this._ejsSplashRoot && this._splashTemplatePath) {
      console.warn(
        '[ warning ] Both EJS_SPLASH_ROOT and SPLASH_TEMPLATE_PATH are set. ' +
          'SPLASH_TEMPLATE_PATH is deprecated — using EJS_SPLASH_ROOT.',
      );
    }

    // Google Analytics gtag measurement ID (e.g. "G-XXXXXXXXXX")
    this._gtagId = envObj['GTAG_ID'] || undefined;

    // Override defaults if needed
    if (!envObj['JWT_SECRET']) {
      this.setEnvironment('jwtSecret', 'd!6!7al-6urnb46-s3cr3t!');
    }
    if (!envObj['EMAIL_SENDER']) {
      this.setEnvironment('emailSender', 'noreply@brightchain.org');
    }
    if (this.production && !envObj['SERVER_URL']) {
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

    this._assetsEnabled = envObj['BRIGHTCHAIN_ASSETS_ENABLED'] === 'true';
    this._jouleEnabled = envObj['JOULE_ENABLED'] === 'true';
    this._burnbagJouleEnabled = envObj['BURNBAG_JOULE_ENABLED'] === 'true';

    // BrightHub profile configuration
    const rawProfileLength = envObj['BRIGHTHUB_PROFILE_LENGTH'];
    // Use a strict positive-integer check — parseInt("1:") would return 1, which is wrong.
    // Only accept strings that consist entirely of digits and represent a positive integer.
    const strictPositiveIntRegex = /^\d+$/;
    const isStrictPositiveInt =
      rawProfileLength !== undefined &&
      rawProfileLength !== null &&
      strictPositiveIntRegex.test(rawProfileLength) &&
      parseInt(rawProfileLength, 10) > 0;
    if (rawProfileLength && !isStrictPositiveInt) {
      console.warn(
        `[ warning ] BRIGHTHUB_PROFILE_LENGTH is not a valid positive integer: "${rawProfileLength}" — using default 2000`,
      );
    }
    this._profileLength = isStrictPositiveInt
      ? parseInt(rawProfileLength as string, 10)
      : 2000;

    const rawPinnedPost = envObj['BRIGHTHUB_PROFILE_PINNED_POST'];
    this._profilePinnedPostEnabled = rawPinnedPost !== 'false';

    // BrightHub profile configuration
    const brightHubFontAwesomeMaxDisplay = parseInt(
      envObj['BRIGHTHUB_FONTAWESOME_MAX_DISPLAY'] ?? '-1',
    );
    this._brightHubFontAwesomeMaxDisplay =
      isNaN(brightHubFontAwesomeMaxDisplay) ||
      brightHubFontAwesomeMaxDisplay < 0
        ? 120
        : brightHubFontAwesomeMaxDisplay;
    const brightHubFontAwesomIconGridSize = parseInt(
      envObj['BRIGHTHUB_FONTAWESOME_ICON_GRID_SIZE'] ?? '-1',
    );
    this._brightHubFontAwesomeIconGridSize =
      isNaN(brightHubFontAwesomIconGridSize) ||
      brightHubFontAwesomIconGridSize < 0
        ? 40
        : brightHubFontAwesomIconGridSize;
    //BrightChat profile configuration
    const brightChatFontAwesomeMaxDisplay = parseInt(
      envObj['BRIGHTCHAT_FONTAWESOME_MAX_DISPLAY'] ?? '-1',
    );
    this._brightChatFontAwesomeMaxDisplay =
      isNaN(brightChatFontAwesomeMaxDisplay) ||
      brightChatFontAwesomeMaxDisplay < 0
        ? 120
        : brightChatFontAwesomeMaxDisplay;
    const brightChatFontAwesomIconGridSize = parseInt(
      envObj['BRIGHTCHAT_FONTAWESOME_ICON_GRID_SIZE'] ?? '-1',
    );
    this._brightChatFontAwesomeIconGridSize =
      isNaN(brightChatFontAwesomIconGridSize) ||
      brightChatFontAwesomIconGridSize < 0
        ? 40
        : brightChatFontAwesomIconGridSize;

    this._gatewayEnabled = envObj['GATEWAY_ENABLED'] === 'true';
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
  public override get emailService(): EmailServices {
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

  /**
   * Root directory for custom EJS templates.
   * Set via EJS_SPLASH_ROOT env var.
   */
  public get ejsSplashRoot(): string | undefined {
    return this._ejsSplashRoot;
  }

  /**
   * @deprecated Use ejsSplashRoot instead.
   * Direct path to a single custom template file.
   * Set via SPLASH_TEMPLATE_PATH env var.
   */
  public get splashTemplatePath(): string | undefined {
    return this._splashTemplatePath;
  }

  /**
   * Google Analytics gtag measurement ID (e.g. "G-XXXXXXXXXX").
   * Set via GTAG_ID env var.
   */
  public get gtagId(): string | undefined {
    return this._gtagId;
  }

  /**
   * Whether BrightChain Assets feature is enabled (default: true).
   * When false, all Assets-related functionality will be disabled,
   * including the BrightChain Asset API endpoints and any UI elements
   * related to Assets.
   */
  public get assetsEnabled(): boolean {
    return this._assetsEnabled;
  }

  /**
   * Whether the Joule microtransaction system is enabled (default: false).
   * When true, Joule-related functionality will be enabled, including
   * cost estimation and charging for uploads to the Digital Burnbag.
   */
  public get jouleEnabled(): boolean {
    return this._jouleEnabled;
  }

  /**
   * Whether Joule functionality is enabled specifically for the Digital Burnbag.
   * This allows for finer-grained control over Joule features.
   */
  public get burnbagJouleEnabled(): boolean {
    return this._burnbagJouleEnabled;
  }

  /**
   * Maximum character length for the BrightHub user profile bio field.
   * Controlled by BRIGHTHUB_PROFILE_LENGTH env var (default: 2000).
   */
  public get profileLength(): number {
    return this._profileLength;
  }

  /**
   * Whether the pinned post feature is enabled for BrightHub profiles.
   * Controlled by BRIGHTHUB_PROFILE_PINNED_POST env var (default: true).
   */
  public get profilePinnedPostEnabled(): boolean {
    return this._profilePinnedPostEnabled;
  }

  /**
   * The maximum number of FontAwesome icons to display in BrightHub posts.
   * Controlled by BRIGHTHUB_FONTAWESOME_MAX_DISPLAY env var.
   * Set to -1 to disable the limit (default behavior).
   */
  public get brightHubFontAwesomeMaxDisplay(): number {
    return this._brightHubFontAwesomeMaxDisplay;
  }

  /**
   * The grid size (in pixels) for FontAwesome icons in BrightHub posts.
   * Controlled by BRIGHTHUB_FONTAWESOME_ICON_GRID_SIZE env var.
   * Set to -1 to use the default size (default behavior).
   */
  public get brightHubFontAwesomeIconGridSize(): number {
    return this._brightHubFontAwesomeIconGridSize;
  }

  /**
   * The maximum number of FontAwesome icons to display in BrightChat picker.
   * Controlled by BRIGHTCHAT_FONTAWESOME_MAX_DISPLAY env var.
   * Set to -1 to disable the limit (default behavior).
   */
  public get brightChatFontAwesomeMaxDisplay(): number {
    return this._brightChatFontAwesomeMaxDisplay;
  }

  /**
   * The grid size (in pixels) for FontAwesome icons in BrightChat picker.
   * Controlled by BRIGHTCHAT_FONTAWESOME_ICON_GRID_SIZE env var.
   * Set to -1 to use the default size (default behavior).
   */
  public get brightChatFontAwesomeIconGridSize(): number {
    return this._brightChatFontAwesomeIconGridSize;
  }

  /**
   * Whether the Email Gateway subsystem is enabled (default: false).
   * When true, the RecipientLookupService (socketmap on port 2526) and
   * InboundProcessor (Maildir watcher) are started alongside the main server.
   * Controlled by GATEWAY_ENABLED env var.
   */
  public get gatewayEnabled(): boolean {
    return this._gatewayEnabled;
  }
}
