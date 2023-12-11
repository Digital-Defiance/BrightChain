import { BrightDbBaseService } from '../lib/services/bright-db-base-service';

import { IBrightDbApplication } from '../lib/interfaces/bright-db-application';

describe('BrightDbBaseService', () => {
  it('provides type-safe access to application', () => {
    const mockApp = {
      db: { collection: jest.fn() },
      getModel: jest.fn(),
      environment: { blockStorePath: '/tmp' },
    } as unknown as IBrightDbApplication;

    const service = new BrightDbBaseService(mockApp);
    // The protected `application` field should be the mock
    expect(
      (service as unknown as { application: IBrightDbApplication }).application,
    ).toBe(mockApp);
  });

  it('can be subclassed with typed application access', () => {
    const mockApp = {
      db: { collection: jest.fn().mockReturnValue({ find: jest.fn() }) },
      getModel: jest.fn().mockReturnValue({ find: jest.fn() }),
      environment: { blockStorePath: '/data' },
    } as unknown as IBrightDbApplication;

    class TestService extends BrightDbBaseService {
      getDb() {
        return this.application.db;
      }
      getEnvPath() {
        return this.application.environment.blockStorePath;
      }
    }

    const svc = new TestService(mockApp);
    expect(svc.getDb()).toBe(mockApp.db);
    expect(svc.getEnvPath()).toBe('/data');
  });
});
