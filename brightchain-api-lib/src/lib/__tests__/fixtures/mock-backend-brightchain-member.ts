/* eslint-disable @nx/enforce-module-boundaries, @typescript-eslint/no-explicit-any */
import { MemberType } from '@brightchain/brightchain-lib';
import {
  EmailString,
  GuidV4,
  SecureBuffer,
  SecureString,
} from '@digitaldefiance/ecies-lib';
import { SignatureBuffer } from '@digitaldefiance/node-ecies-lib';
import { Wallet } from '@ethereumjs/wallet';
import { faker } from '@faker-js/faker';

import { IMemberOperational } from '../../interfaces/member/operational';
import { DefaultBackendIdType } from '../../shared-types';

const createMockWallet = (): Wallet =>
  ({
    getPrivateKey: () =>
      Buffer.from(faker.string.hexadecimal({ length: 64 }), 'hex'),
    getPublicKey: () =>
      Buffer.from(faker.string.hexadecimal({ length: 128 }), 'hex'),
    getAddress: () =>
      Buffer.from(faker.string.hexadecimal({ length: 40 }), 'hex'),
    sign: () => Buffer.from(faker.string.hexadecimal({ length: 128 }), 'hex'),
  }) as any;

export class MockBackendMember implements IMemberOperational<DefaultBackendIdType> {
  private _id: DefaultBackendIdType;
  private _type: MemberType;
  private _name: string;
  private _email: EmailString;
  private _publicKey: Buffer;
  private _creatorId: DefaultBackendIdType;
  private _dateCreated: Date;
  private _dateUpdated: Date;
  private _privateKey?: SecureBuffer;
  private _wallet?: Wallet;
  private _hasPrivateKey: boolean;

  constructor(
    data: Partial<{
      id: DefaultBackendIdType;
      type: MemberType;
      name: string;
      email: EmailString;
      publicKey: Buffer;
      privateKey: SecureBuffer;
      wallet: Wallet;
      creatorId: DefaultBackendIdType;
      dateCreated: Date;
      dateUpdated: Date;
      hasPrivateKey: boolean;
    }> = {},
  ) {
    this._id = data.id || GuidV4.new();
    this._type = data.type || faker.helpers.enumValue(MemberType);
    this._name = data.name || faker.person.fullName();
    this._email = data.email || new EmailString(faker.internet.email());
    this._publicKey =
      data.publicKey ||
      Buffer.from(faker.string.hexadecimal({ length: 130 }), 'hex');
    this._creatorId = data.creatorId || this._id;
    this._dateCreated = data.dateCreated || faker.date.past();
    this._dateUpdated =
      data.dateUpdated ||
      faker.date.between({ from: this._dateCreated, to: new Date() });
    this._privateKey = data.privateKey;
    this._wallet =
      data.wallet ||
      (data.hasPrivateKey !== false ? createMockWallet() : undefined);
    this._hasPrivateKey = data.hasPrivateKey ?? !!this._privateKey;
  }

  get id(): DefaultBackendIdType {
    return this._id;
  }
  get type(): MemberType {
    return this._type;
  }
  get name(): string {
    return this._name;
  }
  get email(): EmailString {
    return this._email;
  }
  get publicKey(): Uint8Array {
    return this._publicKey;
  }
  get creatorId(): DefaultBackendIdType {
    return this._creatorId;
  }
  get dateCreated(): Date {
    return this._dateCreated;
  }
  get dateUpdated(): Date {
    return this._dateUpdated;
  }
  get privateKey(): SecureBuffer | undefined {
    return this._privateKey;
  }
  get wallet(): Wallet | undefined {
    return this._wallet;
  }
  get hasPrivateKey(): boolean {
    return this._hasPrivateKey;
  }

  unloadPrivateKey(): void {}

  unloadWallet(): void {}

  unloadWalletAndPrivateKey(): void {}

  loadWallet(_mnemonic: SecureString): void {}

  loadPrivateKey(_privateKey: SecureBuffer): void {}

  sign(_data: Buffer): SignatureBuffer {
    return Buffer.from(
      faker.string.hexadecimal({ length: 128 }),
      'hex',
    ) as SignatureBuffer;
  }

  verify(_signature: SignatureBuffer, _data: Buffer): boolean {
    return true;
  }

  encryptData(_data: string | Buffer): Uint8Array {
    return Buffer.from(faker.string.hexadecimal({ length: 256 }), 'hex');
  }

  decryptData(_encryptedData: Buffer): Uint8Array {
    return Buffer.from(faker.lorem.paragraph());
  }

  toJson(): string {
    return JSON.stringify({
      id: this._id.toString(),
      type: this._type,
      name: this._name,
      email: this._email.toString(),
      publicKey: this._publicKey.toString('base64'),
      creatorId: this._creatorId.toString(),
      dateCreated: this._dateCreated.toISOString(),
      dateUpdated: this._dateUpdated.toISOString(),
    });
  }

  dispose(): void {}

  static create(
    overrides: Partial<{
      id: DefaultBackendIdType;
      type: MemberType;
      name: string;
      email: EmailString;
      publicKey: Buffer;
      privateKey: SecureBuffer;
      wallet: Wallet;
      creatorId: DefaultBackendIdType;
      dateCreated: Date;
      dateUpdated: Date;
      hasPrivateKey: boolean;
    }> = {},
  ): MockBackendMember {
    return new MockBackendMember(overrides);
  }

  static createMultiple(count: number): MockBackendMember[] {
    return Array.from({ length: count }, () => this.create());
  }

  static createWithPrivateKey(): MockBackendMember {
    return new MockBackendMember({
      privateKey: new SecureBuffer(
        Buffer.from(faker.string.hexadecimal({ length: 64 }), 'hex'),
      ),
      hasPrivateKey: true,
    });
  }

  static createWithoutPrivateKey(): MockBackendMember {
    return new MockBackendMember({
      privateKey: undefined,
      hasPrivateKey: false,
    });
  }
}
