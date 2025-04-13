import { Environment } from '../environment';
import { IApplication as IApplicationBase } from '@digitaldefiance/node-express-suite';

export interface IApplication extends IApplicationBase {
  get environment(): Environment;
  get ready(): boolean;
  start(): Promise<void>;
}
