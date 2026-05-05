import { ECIESService, Member } from '@digitaldefiance/node-ecies-lib';
import {
  EmailString,
  Member as BaseMember,
  MemberType,
  type PlatformID,
  type SecureString,
} from '@digitaldefiance/ecies-lib';

import { BrightChainIdentityError } from './errors';
import type {
  IBrightChainIdentity,
  IBrightChainIdentityBundle,
} from './types';

/**
 * Options accepted by every BrightChainIdentity factory.
 */
export interface BrightChainIdentityOptions<TID extends PlatformID = Buffer> {
  /**
   * ECIES service to use. Defaults to a freshly constructed
   * `ECIESService<TID>()` so that callers can stay one-line. Pass a shared
   * instance to amortize construction cost in hot paths.
   */
  eciesService?: ECIESService<TID>;
  /** Member type. Defaults to `MemberType.User`. */
  memberType?: MemberType;
}

/**
 * Static facade over the `Member` factories exposed by
 * `@digitaldefiance/node-ecies-lib`. Adds:
 *
 * - A predictable, JSON-safe {@link IBrightChainIdentity} descriptor
 *   alongside the unlocked `Member`.
 * - Defensive validation that surfaces a {@link BrightChainIdentityError}
 *   instead of leaking lower-level exception types.
 */
export class BrightChainIdentity {
  private constructor() {
    // static-only namespace
  }

  /**
   * Reconstruct a BrightChain identity from an existing BIP-39 mnemonic.
   * The returned bundle holds live private-key material - dispose the
   * `member` (or hand it to a session store) before the bundle goes out of
   * scope.
   */
  public static fromMnemonic<TID extends PlatformID = Buffer>(
    mnemonic: SecureString,
    name: string,
    email: string,
    options: BrightChainIdentityOptions<TID> = {},
  ): IBrightChainIdentityBundle<TID> {
    if (!name || name.length === 0) {
      throw new BrightChainIdentityError('name is required');
    }
    if (!email || email.length === 0) {
      throw new BrightChainIdentityError('email is required');
    }

    const ecies =
      options.eciesService ?? new ECIESService<TID>();
    const memberType = options.memberType ?? MemberType.User;

    let member: Member<TID>;
    try {
      member = Member.fromMnemonic<TID>(
        mnemonic,
        ecies,
        memberType,
        name,
        new EmailString(email),
      );
    } catch (err) {
      throw new BrightChainIdentityError(
        'Failed to derive identity from mnemonic',
        err,
      );
    }

    return {
      member,
      identity: BrightChainIdentity.describe(member),
    };
  }

  /**
   * Create a brand-new BrightChain identity, generating a fresh mnemonic.
   * The mnemonic is returned alongside the bundle so the caller can show it
   * to the user exactly once and then dispose of it.
   */
  public static create<TID extends PlatformID = Buffer>(
    name: string,
    email: string,
    options: BrightChainIdentityOptions<TID> = {},
  ): IBrightChainIdentityBundle<TID> & { mnemonic: SecureString } {
    if (!name || name.length === 0) {
      throw new BrightChainIdentityError('name is required');
    }
    if (!email || email.length === 0) {
      throw new BrightChainIdentityError('email is required');
    }

    const ecies =
      options.eciesService ?? new ECIESService<TID>();
    const memberType = options.memberType ?? MemberType.User;

    let result: { member: Member<TID>; mnemonic: SecureString };
    try {
      result = Member.newMember<TID>(
        ecies,
        memberType,
        name,
        new EmailString(email),
      );
    } catch (err) {
      throw new BrightChainIdentityError(
        'Failed to create new identity',
        err,
      );
    }

    return {
      member: result.member,
      mnemonic: result.mnemonic,
      identity: BrightChainIdentity.describe(result.member),
    };
  }

  /**
   * Project an unlocked `Member` into the browser-safe descriptor shape.
   * Pure - never touches the private key.
   */
  public static describe<TID extends PlatformID = Buffer>(
    member: BaseMember<TID>,
  ): IBrightChainIdentity<TID> {
    const publicKey = member.publicKey;
    return {
      id: member.id as TID,
      displayName: member.name,
      email:
        member.email instanceof EmailString
          ? member.email.toString()
          : String(member.email),
      publicKeyHex: Buffer.from(publicKey).toString('hex'),
    };
  }
}
