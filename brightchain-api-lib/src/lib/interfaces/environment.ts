/* eslint-disable @typescript-eslint/no-explicit-any */
import { IEnvironment as IEnvironmentBase } from '@digitaldefiance/node-express-suite';
import { IEnvironmentAws } from './environment-aws';

export interface IEnvironment extends Omit<
  IEnvironmentBase,
  'adminId' | 'idAdapter'
> {
  adminId: any;
  idAdapter(bytes: Uint8Array): any;
  /**
   * The FontAwesome kit ID
   */
  fontAwesomeKitId: string;
  /**
   * AWS configuration
   */
  aws: IEnvironmentAws;
}
