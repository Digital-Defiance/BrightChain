/**
 * @fileoverview MemberSignerAdapter — bridges IMemberOperational to ILedgerSigner.
 *
 * IMemberOperational uses Buffer for publicKey and sign(), while ILedgerSigner
 * uses Uint8Array for browser compatibility. This adapter converts between the two.
 *
 * @see Design: Block Chain Ledger — MemberSignerAdapter
 * @see Requirements 3.4, 11.1
 */

import { SignatureUint8Array } from '@digitaldefiance/ecies-lib';
import { ILedgerSigner } from '../interfaces/ledger/ledgerSigner';
import { IMemberOperational } from '../interfaces/member/operational';

export class MemberSignerAdapter implements ILedgerSigner {
  public readonly publicKey: Uint8Array;

  constructor(private readonly member: IMemberOperational) {
    this.publicKey = new Uint8Array(member.publicKey);
  }

  sign(data: Uint8Array): SignatureUint8Array {
    return this.member.sign(Buffer.from(data));
  }
}
