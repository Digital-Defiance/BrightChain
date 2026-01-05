import { SecureString } from '@digitaldefiance/ecies-lib';
import { Environment as BaseEnvironment } from '@digitaldefiance/node-express-suite';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { join } from 'path';
import { Constants } from './constants';
import { IEnvironment } from './interfaces/environment';
import { IEnvironmentAws } from './interfaces/environment-aws';
import { DefaultBackendIdType } from './shared-types';
import { BlockSize } from '@brightchain/brightchain-lib';

export class Environment
  extends BaseEnvironment<DefaultBackendIdType>
  implements IEnvironment
{
  private _fontAwesomeKitId: string;
  private _aws: IEnvironmentAws;
  private _blockStorePath?: string;
  private _blockStoreBlockSize: BlockSize;
  private _useMemoryDocumentStore: boolean;

  private _adminId: any;
  public override get adminId(): any {
    return this._adminId;
  }
  public override set adminId(value: any) {
    this._adminId = value;
  }

  public override get idAdapter(): (bytes: Uint8Array) => any {
    return (bytes: Uint8Array) => {
      // Convert bytes to hex-based ID string; datastore layer owns actual ID type
      const hex = Buffer.from(bytes).toString('hex');
      return hex.slice(0, 24) as DefaultBackendIdType;
    };
  }

  constructor(path?: string, initialization = false, override = true) {
    super(path, initialization, override, Constants);

    const envObj = this.getObject();

    // BrightChain-specific environment variables
    this._fontAwesomeKitId = envObj['FONTAWESOME_KIT_ID'] ?? '';

    this._blockStorePath =
      envObj['BRIGHTCHAIN_BLOCKSTORE_PATH'] ?? envObj['BLOCKSTORE_PATH'];

    const parsedSize = envObj['BRIGHTCHAIN_BLOCKSIZE_BYTES']
      ? Number.parseInt(envObj['BRIGHTCHAIN_BLOCKSIZE_BYTES'], 10)
      : undefined;
    this._blockStoreBlockSize = (parsedSize ?? BlockSize.Small) as BlockSize;

    this._useMemoryDocumentStore = Boolean(envObj['USE_MEMORY_DOCSTORE']);

    this._aws = {
      accessKeyId: new SecureString(envObj['AWS_ACCESS_KEY_ID'] ?? null),
      secretAccessKey: new SecureString(
        envObj['AWS_SECRET_ACCESS_KEY'] ?? null,
      ),
      region: envObj['AWS_REGION'] ?? 'us-east-1',
    };

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

  public get fontAwesomeKitId(): string {
    return this._fontAwesomeKitId;
  }

  public get aws(): IEnvironmentAws {
    return this._aws;
  }

  public get blockStorePath(): string | undefined {
    return this._blockStorePath;
  }

  public get blockStoreBlockSize(): BlockSize {
    return this._blockStoreBlockSize;
  }

  public get useMemoryDocumentStore(): boolean {
    return this._useMemoryDocumentStore || !this._blockStorePath;
  }
}
