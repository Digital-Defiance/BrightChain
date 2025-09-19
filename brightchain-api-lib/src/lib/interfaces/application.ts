import { mongoose } from '../../index';
import { Environment } from '../environment';
import { MongooseDocument, MongooseModel } from '../shared-types';

export interface IApplication {
  get environment(): Environment;
  get db(): typeof mongoose;
  get ready(): boolean;
  start(): Promise<void>;
  getModel<T extends MongooseDocument>(modelName: string): MongooseModel<T>;
}
