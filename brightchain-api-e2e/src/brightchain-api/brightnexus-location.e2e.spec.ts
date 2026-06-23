/**
 * E2E: BrightNexus BSLP geo registry
 *
 * Exercises authenticated publish, member listing, public lookup, and revoke
 * against the running API server (see global-setup.ts).
 */
import { signBslpPublishBody } from '@brightchain/brightnexus-api-lib';
import { BslpPrivacyMode } from '@brightchain/brightnexus-lib';
import axios from 'axios';

const TEST_IP = '203.0.113.42';

function uniqueUser(prefix: string) {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  return {
    username: `${prefix}_${id}`,
    email: `${prefix}_${id}@test.brightchain.local`,
    password: `T3stPass!${id}`,
  };
}

async function registerUser(prefix = 'nexus') {
  const creds = uniqueUser(prefix);
  const res = await axios.post('/api/user/register', {
    username: creds.username,
    email: creds.email,
    password: creds.password,
  });
  return {
    creds,
    token: res.data.data?.token as string,
    memberId: res.data.data?.memberId as string,
    mnemonic: res.data.data?.mnemonic as string,
  };
}

function authHeader(token: string) {
  return { headers: { Authorization: `Bearer ${token}` } };
}

const publishPayload = {
  ipAddress: TEST_IP,
  vector: {
    lat: 47.1996,
    lon: -122.2531,
    alt: 140,
    epoch: 'J2000.0',
  },
  privacy: {
    mode: BslpPrivacyMode.Heisenberg,
    injectedDelayMd: 0.005,
    fuzzRadiusKm: 50,
  },
};

describe('E2E: BrightNexus location registry', () => {
  let authToken: string;
  let memberId: string;
  let mnemonic: string;
  let username: string;
  let email: string;
  let signedBody: ReturnType<typeof signBslpPublishBody>;

  beforeAll(async () => {
    const registered = await registerUser('nexus_e2e');
    authToken = registered.token;
    memberId = registered.memberId;
    mnemonic = registered.mnemonic;
    username = registered.creds.username;
    email = registered.creds.email;
    expect(authToken).toBeTruthy();
    expect(mnemonic).toBeTruthy();

    signedBody = signBslpPublishBody(
      mnemonic,
      username,
      email,
      memberId,
      publishPayload,
    );
  });

  it('publishes BST coordinates and returns DNS TXT hints', async () => {
    const res = await axios.post(
      '/api/brightnexus/location',
      signedBody,
      authHeader(authToken),
    );

    expect(res.status).toBe(200);
    expect(res.data.record?.ipAddress).toBe(TEST_IP);
    expect(res.data.record?.privacy?.mode).toBe(BslpPrivacyMode.Heisenberg);
    expect(typeof res.data.dnsTxt).toBe('string');
    expect(res.data.dnsTxt).toContain('bst=47.1996,-122.2531');
    expect(res.data.wellKnown?.protocol).toBe('bright-spacetime');
  });

  it('lists mine and allows public lookup with signatureVerified', async () => {
    const mine = await axios.get(
      '/api/brightnexus/location/mine',
      authHeader(authToken),
    );
    expect(mine.status).toBe(200);
    expect(
      mine.data.records?.some((r: { ipAddress: string }) => r.ipAddress === TEST_IP),
    ).toBe(true);

    const lookup = await axios.get(
      `/api/brightnexus/location/lookup/${TEST_IP}`,
    );
    expect(lookup.status).toBe(200);
    expect(lookup.data.ipAddress).toBe(TEST_IP);
    expect(lookup.data.entries?.length).toBeGreaterThanOrEqual(1);
    expect(lookup.data.entries[0].lookupSource).toBe('DHT');
    expect(lookup.data.entries[0].signatureVerified).toBe(true);
  });

  it('serves tier-1 discovery manifest from registry', async () => {
    const manifest = await axios.get(
      `/api/brightnexus/discovery/ip/${TEST_IP}/manifest`,
    );
    expect(manifest.status).toBe(200);
    expect(manifest.data.protocol).toBe('bright-spacetime');
    expect(manifest.data.vector.lat).toBe(47.1996);
  });

  it('revokes an announcement and public lookup returns no entries', async () => {
    const revoke = await axios.delete(
      `/api/brightnexus/location/${TEST_IP}`,
      authHeader(authToken),
    );
    expect(revoke.status).toBe(200);

    const lookup = await axios.get(
      `/api/brightnexus/location/lookup/${TEST_IP}`,
    );
    expect(lookup.status).toBe(200);
    expect(lookup.data.entries ?? []).toHaveLength(0);
  });
});
