import { DEFAULT_POOL } from '@brightchain/brightchain-lib';
import { BrightDb } from '@brightchain/db';
import {
  BrightNexusBrightDBName,
  BrightNexusBrightDBPoolID,
  BslpPrivacyMode,
  LocationLookupSource,
} from '@brightchain/brightnexus-lib';
import { LocationRegistryService } from './location-registry-service';
import {
  collectPoolBlocks,
  createBrightNexusTestDb,
  nextTestId,
  samplePublishPayload,
  signSamplePublishBody,
} from '../__tests__/helpers/brightnexus-db';

describe('LocationRegistryService', () => {
  it('publishes and looks up by IP with DHT source', async () => {
    const { service } = createBrightNexusTestDb();
    const memberId = nextTestId();

    const record = await service.publish(memberId, signSamplePublishBody(memberId));
    expect(record.ipAddress).toBe('203.0.113.55');
    expect(record.lookupSource).toBe(LocationLookupSource.Dht);

    const lookup = await service.lookupByIp('203.0.113.55');
    expect(lookup.entries).toHaveLength(1);
    expect(lookup.entries[0].memberIdHex).toBe(memberId);
    expect(lookup.entries[0].privacy.mode).toBe(BslpPrivacyMode.Heisenberg);
  });

  it('updates existing member+IP instead of duplicating', async () => {
    const { service } = createBrightNexusTestDb();
    const memberId = nextTestId();

    const first = await service.publish(memberId, signSamplePublishBody(memberId));
    const second = await service.publish(
      memberId,
      signSamplePublishBody(memberId, {
        ...samplePublishPayload,
        vector: { lat: 48, lon: -123, alt: 200, epoch: 'J2000.0' },
      }),
    );

    expect(second.id).toBe(first.id);
    expect(second.vector.lat).toBe(48);

    const mine = await service.listByMember(memberId);
    expect(mine).toHaveLength(1);
  });

  it('returns multiple members for the same IP sorted newest first', async () => {
    const { service } = createBrightNexusTestDb();
    const memberA = nextTestId('a');
    const memberB = nextTestId('b');

    await service.publish(memberA, signSamplePublishBody(memberA));
    await new Promise((r) => setTimeout(r, 5));
    await service.publish(
      memberB,
      signSamplePublishBody(memberB, {
        ipAddress: '203.0.113.55',
        vector: { lat: 51, lon: -0.1, alt: 10, epoch: 'J2000.0' },
        privacy: {
          mode: BslpPrivacyMode.Heisenberg,
          injectedDelayMd: 0.005,
          fuzzRadiusKm: 50,
        },
      }),
    );

    const lookup = await service.lookupByIp('203.0.113.55');
    expect(lookup.entries.length).toBeGreaterThanOrEqual(2);
    expect(lookup.entries[0].memberIdHex).toBe(memberB);
  });

  it('lists only the caller records and revokes', async () => {
    const { service } = createBrightNexusTestDb();
    const memberId = nextTestId();
    const otherId = nextTestId('other');

    await service.publish(memberId, signSamplePublishBody(memberId));
    await service.publish(
      otherId,
      signSamplePublishBody(otherId, {
        ipAddress: '203.0.113.99',
        vector: { lat: 47.2, lon: -122.3, alt: 140, epoch: 'J2000.0' },
        privacy: {
          mode: BslpPrivacyMode.Heisenberg,
          injectedDelayMd: 0.005,
          fuzzRadiusKm: 50,
        },
      }),
    );

    const mine = await service.listByMember(memberId);
    expect(mine).toHaveLength(1);
    expect(mine[0].ipAddress).toBe('203.0.113.55');

    const removed = await service.revoke(memberId, '203.0.113.55');
    expect(removed).toBe(true);
    expect(await service.revoke(memberId, '203.0.113.55')).toBe(false);

    const lookup = await service.lookupByIp('203.0.113.55');
    expect(lookup.entries).toHaveLength(0);
  });

  it('persists across a new BrightDb instance (restart simulation)', async () => {
    const { store, registry, service } = createBrightNexusTestDb();
    const memberId = nextTestId();
    await service.publish(memberId, signSamplePublishBody(memberId));

    const db2 = new BrightDb(store, {
      name: BrightNexusBrightDBName,
      headRegistry: registry,
      poolId: BrightNexusBrightDBPoolID,
    });
    const service2 = new LocationRegistryService(db2, {
      idToString: (id: string) => id,
      parseId: (id: string) => id,
      generateId: () => nextTestId('ann'),
    });

    const lookup = await service2.lookupByIp('203.0.113.55');
    expect(lookup.entries).toHaveLength(1);
  });

  it('stores blocks in the brightnexus pool only', async () => {
    const { store, service } = createBrightNexusTestDb();
    const memberId = nextTestId();
    await service.publish(memberId, signSamplePublishBody(memberId));

    const nexusBlocks = await collectPoolBlocks(store, BrightNexusBrightDBPoolID);
    const defaultBlocks = await collectPoolBlocks(store, DEFAULT_POOL);

    expect(nexusBlocks.length).toBeGreaterThan(0);
    expect(defaultBlocks.length).toBe(0);
  });
});
