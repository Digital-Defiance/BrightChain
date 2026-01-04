/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose from 'mongoose';

/**
 * Create a minimal IApplication mock suitable for router/middleware tests.
 */
export function createApplicationMock(
  overrides?: any,
  envOverrides?: any,
): any {
  // minimal environment-like object with only fields used by constructors
  const env: any = {
    debug: false,
    detailedDebug: false,
    serverUrl: 'http://localhost:3000',
    disableEmailSend: true,
    basePath: '/',
    apiDistDir: '/tmp/dist/brightchain-api',
    reactDistDir: '/tmp/dist/brightchain-react',
    fontAwesomeKitId: '',
    // mock nested aws config to satisfy email service ctor if used indirectly
    aws: {
      accessKeyId: { value: '' },
      secretAccessKey: { value: '' },
      region: 'us-west-2',
    },
    transactionTimeout: 1000,
    useTransactions: false,
  };

  const application: any = {
    get environment() {
      return { ...(env as any), ...(envOverrides as any) } as any;
    },
    get db() {
      return mongoose;
    },
    get ready() {
      return true;
    },
    async start() {
      /* noop */
    },
    getModel(): any {
      throw new Error('getModel not implemented in test mock');
    },
    ...(overrides as object),
  } as any;

  return application;
}
