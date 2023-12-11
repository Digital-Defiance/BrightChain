import { BrightHubTimelineController } from '../timelineController';

/**
 * Minimal mock application that satisfies the BaseController constructor.
 * The controller only needs `initRouteDefinitions()` to run — no real
 * services or database connections are required for route-config tests.
 */
function createMockApplication() {
  return {
    getModel: jest.fn(),
    getController: jest.fn(),
    setController: jest.fn(),
    services: new Map(),
    environment: {},
  };
}

describe('BrightHubTimelineController — route definitions', () => {
  it('GET /users/:id route has useAuthentication: false', () => {
    const app = createMockApplication();
    const controller = new BrightHubTimelineController(app as any);

    const routeDefinitions = (controller as any).routeDefinitions as Array<{
      handlerKey: string;
      method: string;
      path: string;
      useAuthentication: boolean;
      [key: string]: unknown;
    }>;

    expect(routeDefinitions).toBeDefined();
    expect(Array.isArray(routeDefinitions)).toBe(true);

    const getUserProfileRoute = routeDefinitions.find(
      (r) => r.handlerKey === 'getUserProfile',
    );

    expect(getUserProfileRoute).toBeDefined();
    expect(getUserProfileRoute!.useAuthentication).toBe(false);
  });
});
