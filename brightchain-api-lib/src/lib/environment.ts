import { SecureString } from '@digitaldefiance/ecies-lib';
import { Environment as BaseEnvironment } from '@digitaldefiance/node-express-suite';
/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose from 'mongoose';
import { join } from 'path';
import { Constants } from './constants';
import { IEnvironment } from './interfaces/environment';
import { IEnvironmentAws } from './interfaces/environment-aws';
import { DefaultBackendIdType } from './shared-types';

export class Environment
  extends BaseEnvironment<DefaultBackendIdType>
  implements IEnvironment
{
  private _fontAwesomeKitId: string;
  private _aws: IEnvironmentAws;

  private _adminId: any;
  public override get adminId(): any {
    return this._adminId;
  }
  public override set adminId(value: any) {
    this._adminId = value;
  }

  public override get idAdapter(): (bytes: Uint8Array) => any {
    return (bytes: Uint8Array) => {
      // TODO: Implement proper ID generation from bytes for ObjectId
      // For now, return a dummy or try to construct ObjectId
      // We need mongoose here, but maybe we can just return the bytes as hex string if TId is any?
      // But the app expects ObjectId probably.
      // Let's assume we can require mongoose or it's globally available? No.
      // Let's just return the string for now if that works, or import mongoose.
      // Better to import mongoose.
      const hex = Buffer.from(bytes).toString('hex');
      return new mongoose.Types.ObjectId(hex.padEnd(24, '0').slice(0, 24));
    };
  }

  constructor(path?: string, initialization = false, override = true) {
    super(path, initialization, override, Constants);

    const envObj = this.getObject();

    // BrightChain-specific environment variables
    this._fontAwesomeKitId = envObj['FONTAWESOME_KIT_ID'] ?? '';

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
}
