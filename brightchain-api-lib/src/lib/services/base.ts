import { ClientSession } from 'mongoose';
import { IApplication } from '../interfaces/application';
import { TransactionCallback } from '../shared-types';
import {
  TransactionOptions,
  withTransaction as utilsWithTransaction,
} from '../utils';

export class BaseService {
  protected readonly application: IApplication;

  constructor(application: IApplication) {
    this.application = application;
  }
  public async withTransaction<T>(
    callback: TransactionCallback<T>,
    session?: ClientSession,
    options?: TransactionOptions,
    ...args: any
  ) {
    return await utilsWithTransaction<T>(
      this.application.db.connection,
      this.application.environment.mongo.useTransactions,
      session,
      callback,
      options,
      ...args,
    );
  }
}
