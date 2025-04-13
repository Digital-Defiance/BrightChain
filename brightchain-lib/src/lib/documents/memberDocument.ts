import { BrightChainMember } from '../brightChainMember';
import { EmailString } from '../emailString';
import { MemberType } from '../enumerations/memberType';
import { GuidV4 } from '../guid';
import { SecureString } from '../secureString';
import { ECIESService } from '../services/ecies.service';
import { ServiceProvider } from '../services/service.provider';
import { VotingService } from '../services/voting.service';
import {
  InstanceMethods,
  SchemaDefinition,
  StaticMethods,
} from '../sharedTypes';
import { Document } from './document';

export interface MemberData {
  id: string;
  type: MemberType;
  name: string;
  email: string;
  mnemonic: string;
  publicKey: string; // Base64 encoded
  privateKey: string; // Base64 encoded
  votingPublicKey: string; // Base64 encoded
}

const memberSchema: SchemaDefinition<MemberData> = {
  id: { type: String, required: true },
  type: { type: String, required: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  mnemonic: { type: String, required: true },
  publicKey: { type: String, required: true },
  privateKey: { type: String, required: true },
  votingPublicKey: { type: String, required: true },
};

export class MemberDocument extends Document<MemberData> {
  constructor(member: BrightChainMember, mnemonic: SecureString) {
    const votingPublicKeyBuffer =
      ServiceProvider.getInstance().votingService.votingPublicKeyToBuffer(
        member.votingPublicKey,
      );

    super(
      {
        id: member.id.toString(),
        type: member.type,
        name: member.name,
        email: member.email.toString(),
        mnemonic: mnemonic.value || '',
        publicKey: member.publicKey.toString('base64'),
        privateKey: member.privateKey?.toString('base64') || '',
        votingPublicKey: votingPublicKeyBuffer.toString('base64'),
      },
      memberSchema,
    );
  }

  public static override fromJson<U>(
    json: string,
    schema?: SchemaDefinition<U>,
    instanceMethods: InstanceMethods<U> = {},
    staticMethods: StaticMethods<U> = {},
  ): Document<U> {
    // Add toBrightChainMember to instance methods if it's MemberData
    if (!schema || schema === memberSchema) {
      // Include the toBrightChainMember method in instance methods
      const memberInstanceMethods = {
        ...instanceMethods,
        toBrightChainMember: MemberDocument.prototype.toBrightChainMember,
      };

      return Document.fromJson(
        json,
        schema || (memberSchema as SchemaDefinition<U>),
        memberInstanceMethods as unknown as InstanceMethods<U>,
        staticMethods,
      );
    }

    return Document.fromJson(
      json,
      schema || (memberSchema as SchemaDefinition<U>),
      instanceMethods,
      staticMethods,
    );
  }

  // Add a new method to handle objects directly
  public static fromObject<U>(
    jsonObj: object,
    schema?: SchemaDefinition<U>,
    instanceMethods: InstanceMethods<U> = {},
    staticMethods: StaticMethods<U> = {},
  ): Document<U> {
    return this.fromJson(
      JSON.stringify(jsonObj),
      schema,
      instanceMethods,
      staticMethods,
    );
  }

  public toBrightChainMember(): BrightChainMember {
    const id = new GuidV4(this.get('id'));
    const type = this.get('type') as MemberType;
    const name = this.get('name');
    const email = new EmailString(this.get('email'));
    const publicKey = Buffer.from(this.get('publicKey'), 'base64');
    const privateKey = Buffer.from(this.get('privateKey'), 'base64');
    const votingPublicKey =
      ServiceProvider.getInstance().votingService.bufferToVotingPublicKey(
        Buffer.from(this.get('votingPublicKey'), 'base64'),
      );
    // Instantiate required services
    const eciesService = new ECIESService();
    const votingService = new VotingService(eciesService); // Pass eciesService

    // Create member and derive voting keys
    const member = new BrightChainMember(
      eciesService,
      votingService,
      type,
      name,
      email,
      publicKey,
      votingPublicKey,
      privateKey,
      undefined, // wallet will be loaded separately with mnemonic if needed
      id,
      undefined, // dateCreated - let constructor default
      undefined, // dateUpdated - let constructor default
      undefined, // creatorId - let constructor default
    );

    // Derive voting keys from ECDH keys - This might be redundant if constructor does it? Check constructor logic.
    // Constructor already derives voting keys if privateKey is provided.
    // member.deriveVotingKeyPair(); // Remove this line as constructor handles it

    return member;
  }

  public getMnemonic(): string {
    return this.get('mnemonic');
  }
}
