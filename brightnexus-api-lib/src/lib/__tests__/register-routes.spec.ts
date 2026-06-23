import request from 'supertest';
import express, { Router } from 'express';
import { registerBrightNexusRoutesOnRouter } from '../controllers/register-routes';
import { createBrightNexusDeps } from '../wiring/create-brightnexus-deps';
import {
  createBrightNexusTestDb,
  ensureTestMemberKeys,
  nextTestId,
  signSamplePublishBody,
  testBrightNexusExternalDeps,
} from './helpers/brightnexus-db';

describe('registerBrightNexusRoutesOnRouter', () => {
  it('mounts lookup route under the configured prefix', async () => {
    const memberId = nextTestId();
    ensureTestMemberKeys(memberId);
    const { db, service } = createBrightNexusTestDb();
    await service.publish(memberId, signSamplePublishBody(memberId));

    const deps = createBrightNexusDeps(
      db,
      testBrightNexusExternalDeps({
        generateId: () => nextTestId('ann'),
        idToString: (id) => id,
        parseId: (id) => id,
      }),
    );

    const app = express();
    app.use(express.json());
    const router = Router();
    registerBrightNexusRoutesOnRouter(
      router,
      {
        authenticationMiddleware: (_req, _res, next) => next(),
        cryptoAuthenticationMiddleware: (_req, _res, next) => next(),
        environment: { enabledFeatures: [] },
        authProvider: {},
        constants: {},
      } as never,
      deps,
      '/brightnexus/location',
    );
    app.use(router);

    const res = await request(app)
      .get(`/brightnexus/location/lookup/203.0.113.55`)
      .expect(200);

    expect(res.body.entries).toHaveLength(1);
  });
});
