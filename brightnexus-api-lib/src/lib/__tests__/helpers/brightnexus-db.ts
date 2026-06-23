import {
  BlockSize,
  DEFAULT_POOL,
  PooledMemoryBlockStore,
} from '@brightchain/brightchain-lib';
import { BrightDb } from '@brightchain/db';
import {
  BrightNexusBrightDBName,
  BrightNexusBrightDBPoolID,
  BslpPrivacyMode,
  type IBrightNexusLocationPublishRequest,
} from '@brightchain/brightnexus-lib';
import { InMemoryHeadRegistry } from '@brightchain/db';
import {
  ECIESService,
  EmailString,
  Member,
  MemberType,
  SecureString,
} from '@digitaldefiance/ecies-lib';
import { signBslpPublishBody } from '../../bslp-client-signing';
import type { IBrightNexusExternalDeps } from '../../wiring/create-brightnexus-deps';
import type { LocationRegistryService } from '../../services/location-registry-service';
import { LocationRegistryService as LocationRegistryServiceClass } from '../../services/location-registry-service';

/** BIP39 test mnemonic (matches user-management e2e vectors). */
export const TEST_BSLP_MNEMONIC =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art';

const memberPublicKeys = new Map<string, string>();

export type TestMemberId = string;

let idCounter = 0;

export function nextTestId(prefix = 'member'): TestMemberId {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

export async function collectPoolBlocks(
  store: PooledMemoryBlockStore,
  poolId: string,
): Promise<string[]> {
  const results: string[] = [];
  for await (const hash of store.listBlocksInPool(poolId)) {
    results.push(hash);
  }
  return results;
}

export interface IBrightNexusTestDb {
  store: PooledMemoryBlockStore;
  registry: ReturnType<typeof InMemoryHeadRegistry.createIsolated>;
  db: BrightDb;
  service: LocationRegistryService<TestMemberId>;
}

export function createBrightNexusTestDb(): IBrightNexusTestDb {
  const store = new PooledMemoryBlockStore(BlockSize.Small);
  const registry = InMemoryHeadRegistry.createIsolated();
  const db = new BrightDb(store, {
    name: BrightNexusBrightDBName,
    headRegistry: registry,
    poolId: BrightNexusBrightDBPoolID,
  });

  const ids = {
    idToString: (id: TestMemberId) => id,
    parseId: (id: string) => id,
    generateId: () => nextTestId('ann'),
  };

  const service = new LocationRegistryServiceClass(db, ids);

  return { store, registry, db, service };
}

export const samplePublishPayload = {
  ipAddress: '203.0.113.55',
  vector: { lat: 47.2, lon: -122.3, alt: 140, epoch: 'J2000.0' },
  privacy: {
    mode: BslpPrivacyMode.Heisenberg,
    injectedDelayMd: 0.005,
    fuzzRadiusKm: 50,
  },
};

/** Register a test member's public key for BSLP signature verification. */
export function registerTestMemberPublicKey(
  memberIdHex: string,
  publicKeyHex: string,
): void {
  memberPublicKeys.set(memberIdHex, publicKeyHex);
}

export function ensureTestMemberKeys(memberIdHex: string): string {
  let hex = memberPublicKeys.get(memberIdHex);
  if (hex) return hex;

  const ecies = new ECIESService();
  const { member } = Member.newMember(
    ecies,
    MemberType.User,
    memberIdHex,
    new EmailString(`${memberIdHex}@test.brightchain.local`),
    new SecureString(TEST_BSLP_MNEMONIC),
  );
  hex = Buffer.from(member.publicKey).toString('hex');
  memberPublicKeys.set(memberIdHex, hex);
  return hex;
}

export function signSamplePublishBody(
  memberIdHex: string,
  body: Omit<IBrightNexusLocationPublishRequest, 'signature'> = samplePublishPayload,
): IBrightNexusLocationPublishRequest {
  ensureTestMemberKeys(memberIdHex);
  return signBslpPublishBody(
    TEST_BSLP_MNEMONIC,
    memberIdHex,
    `${memberIdHex}@test.brightchain.local`,
    memberIdHex,
    body,
  );
}

/** @deprecated Use signSamplePublishBody — unsigned bodies are rejected by the API. */
export const samplePublishBody = samplePublishPayload;

export function testBrightNexusExternalDeps<TID extends string>(
  base: Pick<
    IBrightNexusExternalDeps<TID>,
    'generateId' | 'idToString' | 'parseId' | 'parseSafeId'
  >,
): IBrightNexusExternalDeps<TID> {
  return {
    ...base,
    getMemberPublicKeyHex: async (memberId) =>
      memberPublicKeys.get(base.idToString(memberId)) ?? null,
    getMemberPublicKeyHexByIdString: async (memberIdHex) =>
      memberPublicKeys.get(memberIdHex) ?? null,
  };
}
