/* eslint-disable @typescript-eslint/no-explicit-any */
import { MemoryDocumentStore } from '../../datastore/memory-document-store';
import { Constants } from '../../constants';

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

  const store = new MemoryDocumentStore();
  const application: any = {
    get environment() {
      return { ...(env as any), ...(envOverrides as any) } as any;
    },
    get constants() {
      return Constants;
    },
    db: store,
    get ready() {
      return true;
    },
    async start() {
      /* noop */
    },
    getModel(modelName: string): any {
      return store.collection(modelName);
    },
    ...(overrides as object),
  } as any;

  return application;
}
