import { IApplication as IApplicationBase } from '@digitaldefiance/node-express-suite';
import { Environment } from '../environment';

export interface IApplication extends IApplicationBase {
  get environment(): Environment;
  get ready(): boolean;
  start(): Promise<void>;
}
