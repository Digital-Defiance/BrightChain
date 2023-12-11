/**
 * Unit Tests: Controller mnemonic passthrough
 *
 * Tests that BrightDbUserController.register extracts the optional mnemonic
 * from the request body, wraps it in SecureString, and passes it to
 * BrightDbAuthService.register.
 *
 * **Validates: Requirements 5.1, 5.3, 6.3**
 */

import { SecureString } from '@digitaldefiance/ecies-lib';
import type { NextFunction, Request, Response } from 'express';
import { BrightDbUserController } from '../lib/controllers/user';
import type { IBrightDbApplication } from '../lib/interfaces/bright-db-application';

// ─── Mock Helpers ───────────────────────────────────────────────────────────

const mockRegister = jest.fn();

function buildMockApplication(): IBrightDbApplication<Buffer> {
  return {
    services: {
      get: jest.fn().mockReturnValue({
        register: mockRegister,
      }),
    },
    environment: {
      mongo: { useTransactions: false },
    },
    constants: {},
    db: { collection: jest.fn(), connection: undefined },
    getModel: jest.fn(),
    // BaseController checks for mongoApplication via this property
    mongo: undefined,
  } as unknown as IBrightDbApplication<Buffer>;
}

function buildMockRequest(body: Record<string, unknown>): Request {
  return { body } as unknown as Request;
}

const mockRes = {} as Response;
const mockNext = jest.fn() as NextFunction;

// ─── Test Suite ─────────────────────────────────────────────────────────────

describe('BrightDbUserController.register — mnemonic passthrough', () => {
  let controller: BrightDbUserController<Buffer>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRegister.mockResolvedValue({
      token: 'test-token',
      memberId: 'test-member-id',
      energyBalance: 100,
    });
    controller = new BrightDbUserController(buildMockApplication());
  });

  it('passes SecureString(mnemonic) to auth service when mnemonic is present', async () => {
    const req = buildMockRequest({
      username: 'testuser',
      email: 'test@example.com',
      password: 'Passw0rd!',
      mnemonic:
        'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
    });

    await controller.register(req, mockRes, mockNext);

    expect(mockRegister).toHaveBeenCalledTimes(1);
    const [username, email, password, mnemonic] = mockRegister.mock.calls[0];
    expect(username).toBe('testuser');
    expect(email).toBe('test@example.com');
    expect(password).toBeInstanceOf(SecureString);
    expect(password.value).toBe('Passw0rd!');
    expect(mnemonic).toBeInstanceOf(SecureString);
    expect(mnemonic.value).toBe(
      'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
    );
  });

  it('passes undefined when mnemonic is absent', async () => {
    const req = buildMockRequest({
      username: 'testuser',
      email: 'test@example.com',
      password: 'Passw0rd!',
    });

    await controller.register(req, mockRes, mockNext);

    expect(mockRegister).toHaveBeenCalledTimes(1);
    const [, , , mnemonic] = mockRegister.mock.calls[0];
    expect(mnemonic).toBeUndefined();
  });

  it('returns 400 with error message when auth service throws collision error', async () => {
    mockRegister.mockRejectedValue(new Error('validation_mnemonicInUse'));

    const req = buildMockRequest({
      username: 'testuser',
      email: 'test@example.com',
      password: 'Passw0rd!',
      mnemonic:
        'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
    });

    const result = await controller.register(req, mockRes, mockNext);

    expect(result.statusCode).toBe(400);
    expect((result.response as { message: string }).message).toContain(
      'validation_mnemonicInUse',
    );
  });
});
