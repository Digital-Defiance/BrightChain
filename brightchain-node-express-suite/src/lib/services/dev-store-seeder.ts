/**
 * @fileoverview Lightweight dev store seeder for BrightDB-backed applications.
 *
 * Creates three members (system, admin, member) using MemberStore.createMember()
 * and prints their credentials so the user can log in during development.
 *
 * This is the base-level seeding that works with only brightchain-lib + db.
 * The full BrightChain RBAC seeding (roles, user-roles, mnemonics) lives in
 * brightchain-api-lib's BrightChainDatabasePlugin.initializeDevStore() override.
 *
 * @module services/dev-store-seeder
 */

import type { IBlockStore } from '@brightchain/brightchain-lib';
import {
  initializeBrightChain,
  MemberStore,
  type INewMemberData,
} from '@brightchain/brightchain-lib';
import type { BrightDb } from '@brightchain/db';
import { EmailString, MemberType } from '@digitaldefiance/ecies-lib';
import { ECIESService, type PlatformID } from '@digitaldefiance/node-ecies-lib';
import type { SecureString } from '@digitaldefiance/ecies-lib';

/**
 * Result of a single member creation during dev seeding.
 */
export interface IDevMemberResult {
  label: string;
  name: string;
  email: string;
  mnemonic: string;
  publicKeyHex: string;
  id: string;
  type: MemberType;
}

/**
 * Full result of dev store seeding.
 */
export interface IDevStoreSeederResult {
  members: IDevMemberResult[];
  poolName: string;
}

/**
 * Default member definitions for dev seeding.
 * Email addresses are built dynamically from the configured email domain.
 */
const DEFAULT_DEV_MEMBERS: Array<{
  label: string;
  type: MemberType;
  name: string;
}> = [
  {
    label: 'System',
    type: MemberType.System,
    name: 'system',
  },
  {
    label: 'Admin',
    type: MemberType.User,
    name: 'admin',
  },
  {
    label: 'Member',
    type: MemberType.User,
    name: 'member',
  },
];

/**
 * Seed the dev database with basic members and print their credentials.
 *
 * @param blockStore - The block store backing the BrightDb instance.
 * @param db - The BrightDb instance to seed.
 * @param poolName - The dev pool name (for display purposes).
 * @param emailDomain - Domain for dev member email addresses (e.g. 'example.com').
 * @returns The seeding result with member credentials.
 */
export async function seedDevStore<TID extends PlatformID>(
  blockStore: IBlockStore,
  db: BrightDb,
  poolName: string,
  emailDomain = 'example.com',
  existingMemberStore?: MemberStore<TID>,
): Promise<IDevStoreSeederResult> {
  // MemberStore.createMember() depends on ServiceProvider (eciesService, cblService).
  // initializeBrightChain() is idempotent — safe to call even if already initialized.
  initializeBrightChain();

  const memberStore = existingMemberStore ?? new MemberStore<TID>(blockStore, db);
  const results: IDevMemberResult[] = [];

  // Create a node-ecies-lib ECIESService for deriving public keys from mnemonics.
  // ServiceProvider stores the base ecies-lib ECIESService which does NOT have
  // walletToSimpleKeyPairBuffer — only the node-ecies-lib subclass does.
  const eciesService = new ECIESService<TID>();

  for (const def of DEFAULT_DEV_MEMBERS) {
    const email = `${def.name}@${emailDomain}`;
    const memberData: INewMemberData = {
      type: def.type,
      name: def.name,
      contactEmail: new EmailString(email),
    };

    const { reference, mnemonic } = await memberStore.createMember(memberData);

    // Derive the public key hex from the mnemonic so callers can update
    // the environment (e.g. SYSTEM_PUBLIC_KEY) without a second round-trip.
    let publicKeyHex = '';
    try {
      const { wallet } = eciesService.walletAndSeedFromMnemonic(mnemonic);
      const keyPair = eciesService.walletToSimpleKeyPairBuffer(wallet);
      publicKeyHex = keyPair.publicKey.toString('hex');
    } catch (err) {
      console.warn(
        `[dev-store-seeder] Failed to derive publicKeyHex for ${def.name}:`,
        err instanceof Error ? err.message : err,
      );
    }

    results.push({
      label: def.label,
      name: def.name,
      email,
      mnemonic: (mnemonic as SecureString).value ?? '',
      publicKeyHex,
      id: String(reference.id),
      type: def.type,
    });

    // Store the public key in the 'users' collection so that
    // getMemberPublicKeyHex() can find it via the fast DB lookup path.
    // Without this, the fallback getMember() path returns undefined
    // because it strips the public key during CBL hydration.
    if (publicKeyHex) {
      try {
        const usersCol = db.collection<{
          _id?: string;
          publicKey?: string;
          username?: string;
          email?: string;
          type?: number;
        }>('users');
        const idHex = Buffer.from(
          reference.id as unknown as Uint8Array,
        ).toString('hex');
        await usersCol.insertOne({
          _id: idHex,
          publicKey: publicKeyHex,
          username: def.name,
          email,
          type: def.type,
        } as never);
      } catch (err) {
        console.warn(
          `[dev-store-seeder] Failed to store publicKey in users collection for ${def.name}:`,
          err instanceof Error ? err.message : err,
        );
      }
    }
  }

  return { members: results, poolName };
}

/**
 * Print dev store seeding results to the console.
 */
export function printDevStoreResults(result: IDevStoreSeederResult): void {
  const log = (msg: string) => console.log(msg);

  log('');
  log('=== BrightChain Dev Account Credentials ===');
  log('');
  log(`  Pool:         ${result.poolName}`);
  log(`  Block Store:  in-memory (ephemeral)`);
  log('');

  for (const member of result.members) {
    log(`  ${member.label} ID:       ${member.id}`);
    log(`  ${member.label} Name:     ${member.name}`);
    log(`  ${member.label} Email:    ${member.email}`);
    log(`  ${member.label} Mnemonic: ${member.mnemonic}`);
    log('');
  }

  log('=== End BrightChain Dev Account Credentials ===');
  log('');
}
