/**
 * E2E test helpers — authenticated request factory, test data factories.
 */
import { Express } from 'express';
import request from 'supertest';

export interface ITestUser {
  id: string;
  username: string;
  email: string;
}

/**
 * Create an authenticated supertest agent for a specific user.
 * The bearer token encodes the user ID so the stub authProvider
 * can extract it and return the correct user context.
 */
export function authenticatedAgent(app: Express, user: ITestUser) {
  const token = `Bearer ${user.id}`;
  return {
    get: (url: string) =>
      request(app)
        .get(url)
        .set('Authorization', token)
        .set('x-test-user-id', user.id)
        .set('x-test-username', user.username),
    post: (url: string) =>
      request(app)
        .post(url)
        .set('Authorization', token)
        .set('x-test-user-id', user.id)
        .set('x-test-username', user.username),
    put: (url: string) =>
      request(app)
        .put(url)
        .set('Authorization', token)
        .set('x-test-user-id', user.id)
        .set('x-test-username', user.username),
    patch: (url: string) =>
      request(app)
        .patch(url)
        .set('Authorization', token)
        .set('x-test-user-id', user.id)
        .set('x-test-username', user.username),
    delete: (url: string) =>
      request(app)
        .delete(url)
        .set('Authorization', token)
        .set('x-test-user-id', user.id)
        .set('x-test-username', user.username),
  };
}

/**
 * Factory for test users.
 */
export function createTestUser(overrides?: Partial<ITestUser>): ITestUser {
  return {
    id: overrides?.id ?? 'test-user-1',
    username: overrides?.username ?? 'testuser',
    email: overrides?.email ?? 'test@example.com',
  };
}

/**
 * Factory for test file upload data.
 */
export function createTestFileData(content = 'Hello, World!') {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  return {
    fileName: 'test-file.txt',
    mimeType: 'text/plain',
    totalSizeBytes: data.byteLength,
    data,
    checksum: 'test-checksum',
  };
}
