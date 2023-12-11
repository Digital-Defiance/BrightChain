import { ApiRouter } from '../api';

describe('ApiRouter', () => {
  it('should be defined', () => {
    expect(ApiRouter).toBeDefined();
  });

  it('should have a constructor that accepts an application', () => {
    // Verify the constructor signature exists
    expect(typeof ApiRouter).toBe('function');
    expect(ApiRouter.length).toBeGreaterThanOrEqual(1); // At least 1 parameter
  });
});
