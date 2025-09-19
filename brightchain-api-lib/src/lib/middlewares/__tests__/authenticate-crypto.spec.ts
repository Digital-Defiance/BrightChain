import { AccountStatus } from '@brightchain/brightchain-lib';
import express from 'express';
import request from 'supertest';
import { createApplicationMock } from '../../__tests__/helpers/application.mock';

// Mock UserService used inside authenticate-crypto for the happy path test
jest.mock('../../services/user', () => {
  return {
    UserService: jest.fn().mockImplementation(() => ({
      loginWithMnemonic: jest.fn().mockResolvedValue({
        userDoc: {
          _id: { toString: () => 'USER_ID' },
          email: 'user@example.com',
        },
        userMember: { id: 'user-member' },
        adminMember: { id: 'admin-member' },
      }),
      loginWithPassword: jest.fn().mockResolvedValue({
        userDoc: {
          _id: { toString: () => 'USER_ID' },
          email: 'user@example.com',
        },
        userMember: { id: 'user-member' },
        adminMember: { id: 'admin-member' },
      }),
    })),
  };
});

// Import after mocks are set up
import { authenticateCrypto } from '../authenticate-crypto';

const VALID_USER_ID = 'USER_ID';

function makeApp(
  overrides: {
    getModelImpl?: () => unknown;
    setUser?: boolean | { id: string };
  } = {},
) {
  const app = express();
  app.use(express.json());

  const application = createApplicationMock(
    {
      getModel: () =>
        overrides.getModelImpl ? overrides.getModelImpl() : ({} as unknown),
    },
    { mongo: { uri: 'mongodb://localhost:27017', transactionTimeout: 60000 } },
  );

  // Optional middleware to set req.user
  if (overrides.setUser) {
    app.use((req, _res, next) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (req as any).user =
        typeof overrides.setUser === 'object'
          ? overrides.setUser
          : { id: VALID_USER_ID };
      next();
    });
  }

  // Endpoint under test
  app.post(
    '/crypto',
    (req, res, next) => authenticateCrypto(application, req, res, next),
    (_req, res) => {
      // If authenticateCrypto calls next(), we land here
      // Return something that lets us assert success
      res.status(200).json({ ok: true });
    },
  );

  return app;
}

// Helper to build a chainable mongoose-like query stub for findById().session().exec()
function buildFindByIdChain(result: unknown) {
  return {
    session: () => ({
      exec: async () => result,
    }),
  };
}

describe('authenticateCrypto middleware', () => {
  it('returns 401 when req.user is missing', async () => {
    const app = makeApp();
    const res = await request(app).post('/crypto').send({});
    expect(res.status).toBe(401);
  });

  it('returns 400 when mnemonic and password are missing', async () => {
    const app = makeApp({ setUser: { id: VALID_USER_ID } });
    const res = await request(app).post('/crypto').send({});
    expect(res.status).toBe(400);
  });

  it('returns 403 when user not found', async () => {
    const getModelImpl = () => ({
      findById: () => buildFindByIdChain(null),
    });
    const app = makeApp({ getModelImpl, setUser: { id: VALID_USER_ID } });
    const res = await request(app)
      .post('/crypto')
      .send({ mnemonic: 'seed phrase' });
    expect(res.status).toBe(403);
  });

  it('returns 403 when user is inactive', async () => {
    const getModelImpl = () => ({
      findById: () =>
        buildFindByIdChain({
          _id: { toString: () => VALID_USER_ID },
          email: 'user@example.com',
          accountStatus: AccountStatus.AdminLock,
        }),
    });
    const app = makeApp({ getModelImpl, setUser: { id: VALID_USER_ID } });
    const res = await request(app).post('/crypto').send({ password: 'pass' });
    expect(res.status).toBe(403);
  });

  it('returns 403 when fetched user id does not match req.user.id', async () => {
    const getModelImpl = () => ({
      findById: () =>
        buildFindByIdChain({
          _id: { toString: () => '507f1f77bcf86cd799439012' },
          email: 'user@example.com',
          accountStatus: AccountStatus.Active,
        }),
    });
    const app = makeApp({ getModelImpl, setUser: { id: VALID_USER_ID } });
    const res = await request(app)
      .post('/crypto')
      .send({ mnemonic: 'seed phrase' });
    expect(res.status).toBe(403);
  });

  it('succeeds and sets members when mnemonic is valid', async () => {
    const getModelImpl = () => ({
      findById: () =>
        buildFindByIdChain({
          _id: { toString: () => VALID_USER_ID },
          email: 'user@example.com',
          accountStatus: AccountStatus.Active,
        }),
    });
    const app = makeApp({ getModelImpl, setUser: { id: VALID_USER_ID } });
    const res = await request(app)
      .post('/crypto')
      .send({ mnemonic: 'seed phrase' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});
