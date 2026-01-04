import { IEnvironmentAws } from './environment-aws';
import { IEnvironment as IEnvironmentBase } from '@digitaldefiance/node-express-suite';

export interface IEnvironment extends Omit<IEnvironmentBase, 'adminId' | 'idAdapter'> {
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
