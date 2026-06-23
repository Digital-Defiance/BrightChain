import { BslpPrivacyMode } from '@brightchain/brightnexus-lib';
import request from 'supertest';
import {
  ensureTestMemberKeys,
  samplePublishPayload,
  signSamplePublishBody,
} from '../helpers/brightnexus-db';
import { createBrightNexusTestServer } from './test-server';

const PREFIX = '/brightnexus/location';

function auth(userId: string) {
  return { Authorization: `Bearer ${userId}` };
}

describe('LocationController integration', () => {
  it('POST without auth returns 401', async () => {
    const { app } = createBrightNexusTestServer();
    await request(app)
      .post(PREFIX)
      .send(signSamplePublishBody('anon'))
      .expect(401);
  });

  it('POST with auth publishes and returns dnsTxt and wellKnown', async () => {
    const { app } = createBrightNexusTestServer();
    const memberId = 'user-publish-1';
    ensureTestMemberKeys(memberId);
    const body = signSamplePublishBody(memberId);

    const res = await request(app)
      .post(PREFIX)
      .set(auth(memberId))
      .send(body)
      .expect(200);

    expect(res.body.message).toBeDefined();
    expect(res.body.record.ipAddress).toBe(body.ipAddress);
    expect(res.body.record.memberIdHex).toBe(memberId);
    expect(typeof res.body.dnsTxt).toBe('string');
    expect(res.body.dnsTxt).toContain('bst=');
    expect(res.body.wellKnown.protocol).toBe('bright-spacetime');
  });

  it('POST with invalid body returns 400', async () => {
    const { app } = createBrightNexusTestServer();
    await request(app)
      .post(PREFIX)
      .set(auth('user-bad'))
      .send({ ipAddress: 'not-an-ip' })
      .expect(400);
  });

  it('rejects publish when signature does not verify', async () => {
    const { app } = createBrightNexusTestServer();
    const memberId = 'user-bad-sig';
    ensureTestMemberKeys(memberId);

    await request(app)
      .post(PREFIX)
      .set(auth(memberId))
      .send({
        ...signSamplePublishBody(memberId),
        signature: '00'.repeat(64),
      })
      .expect(400);
  });

  it('GET /mine returns only the authenticated member records', async () => {
    const { app } = createBrightNexusTestServer();
    const memberA = 'user-a';
    const memberB = 'user-b';
    ensureTestMemberKeys(memberA);
    ensureTestMemberKeys(memberB);

    await request(app)
      .post(PREFIX)
      .set(auth(memberA))
      .send(signSamplePublishBody(memberA))
      .expect(200);

    await request(app)
      .post(PREFIX)
      .set(auth(memberB))
      .send(
        signSamplePublishBody(memberB, {
          ...samplePublishPayload,
          ipAddress: '203.0.113.77',
        }),
      )
      .expect(200);

    const res = await request(app)
      .get(`${PREFIX}/mine`)
      .set(auth(memberA))
      .expect(200);

    expect(res.body.records).toHaveLength(1);
    expect(res.body.records[0].ipAddress).toBe(samplePublishPayload.ipAddress);
  });

  it('GET /lookup/:ip is public and returns signatureVerified', async () => {
    const { app } = createBrightNexusTestServer();
    const memberId = 'user-lookup';
    ensureTestMemberKeys(memberId);
    const body = signSamplePublishBody(memberId);

    await request(app)
      .post(PREFIX)
      .set(auth(memberId))
      .send(body)
      .expect(200);

    const res = await request(app)
      .get(`${PREFIX}/lookup/${body.ipAddress}`)
      .expect(200);

    expect(res.body.ipAddress).toBe(body.ipAddress);
    expect(res.body.entries).toHaveLength(1);
    expect(res.body.entries[0].privacy.mode).toBe(BslpPrivacyMode.Heisenberg);
    expect(res.body.entries[0].signatureVerified).toBe(true);
  });

  it('GET discovery manifest mirrors registry entry', async () => {
    const { app } = createBrightNexusTestServer();
    const memberId = 'user-discovery';
    ensureTestMemberKeys(memberId);
    const body = signSamplePublishBody(memberId);

    await request(app)
      .post(PREFIX)
      .set(auth(memberId))
      .send(body)
      .expect(200);

    const manifest = await request(app)
      .get(`/brightnexus/discovery/ip/${body.ipAddress}/manifest`)
      .expect(200);

    expect(manifest.body.protocol).toBe('bright-spacetime');
    expect(manifest.body.vector.lat).toBe(body.vector.lat);
  });

  it('DELETE revokes and lookup returns empty', async () => {
    const { app } = createBrightNexusTestServer();
    const memberId = 'user-revoke';
    ensureTestMemberKeys(memberId);
    const body = signSamplePublishBody(memberId);

    await request(app)
      .post(PREFIX)
      .set(auth(memberId))
      .send(body)
      .expect(200);

    await request(app)
      .delete(`${PREFIX}/${body.ipAddress}`)
      .set(auth(memberId))
      .expect(200);

    const lookup = await request(app)
      .get(`${PREFIX}/lookup/${body.ipAddress}`)
      .expect(200);

    expect(lookup.body.entries).toHaveLength(0);
  });

  it('DELETE by another member returns 404', async () => {
    const { app } = createBrightNexusTestServer();
    const owner = 'owner';
    ensureTestMemberKeys(owner);
    const body = signSamplePublishBody(owner);

    await request(app)
      .post(PREFIX)
      .set(auth(owner))
      .send(body)
      .expect(200);

    await request(app)
      .delete(`${PREFIX}/${body.ipAddress}`)
      .set(auth('intruder'))
      .expect(404);
  });
});
