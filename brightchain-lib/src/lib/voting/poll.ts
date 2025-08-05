import { createHash, randomBytes } from 'crypto';
import { KeyPair as PaillierKeyPair } from 'paillier-bigint';
import { BrightChainMember } from '../brightChainMember';
import { VOTING } from '../constants';
import { ServiceProvider } from '../services/service.provider';
import {
  SimpleKeyPairBuffer as ECKeyPairBuffer,
  SignatureBuffer,
} from '../types';

export class VotingPoll {
  public readonly choices: string[];
  public readonly votes: bigint[];
  private readonly paillierKeyPair: PaillierKeyPair;
  private readonly ecKeyPair: ECKeyPairBuffer;
  public readonly receipts: Map<Buffer, Buffer> = new Map<Buffer, Buffer>();

  constructor(
    choices: string[],
    paillierKeyPair: PaillierKeyPair,
    ecKeyPair: ECKeyPairBuffer,
    votes: bigint[],
  ) {
    this.choices = choices;
    this.paillierKeyPair = paillierKeyPair;
    this.ecKeyPair = ecKeyPair;
    this.votes = votes;
  }

  public generateEncryptedReceipt(member: BrightChainMember): Buffer {
    const randomNonce = randomBytes(16).toString(VOTING.KEY_FORMAT);
    const hash = Buffer.from(
      createHash(VOTING.HASH_ALGORITHM)
        .update(`${Date.now()}-${randomNonce}-${member.id.asShortHexGuid}`)
        .digest('hex'),
      'hex',
    );
    const signature = ServiceProvider.getInstance().eciesService.signMessage(
      this.ecKeyPair.privateKey,
      hash,
    );
    const receipt = Buffer.concat([hash, signature]);
    const encryptedReceipt = ServiceProvider.getInstance().eciesService.encrypt(
      member.publicKey,
      receipt,
    );
    this.receipts.set(member.id.asRawGuidBuffer, encryptedReceipt);
    return encryptedReceipt;
  }

  public memberVoted(member: BrightChainMember): boolean {
    return this.receipts.has(member.id.asRawGuidBuffer);
  }

  public verifyReceipt(
    member: BrightChainMember,
    encryptedReceipt: Buffer,
  ): boolean {
    const memberId = member.id.asRawGuidBuffer;
    const foundReceipt = this.receipts.get(memberId);
    if (!foundReceipt) {
      return false;
    }
    if (Buffer.compare(foundReceipt, encryptedReceipt) !== 0) {
      return false;
    }
    const decryptedReceipt =
      ServiceProvider.getInstance().eciesService.decryptSingleWithHeader(
        this.ecKeyPair.privateKey,
        encryptedReceipt,
      );
    const hash = decryptedReceipt.subarray(0, 32);
    const signature = decryptedReceipt.subarray(32) as SignatureBuffer;
    return ServiceProvider.getInstance().eciesService.verifyMessage(
      this.ecKeyPair.publicKey,
      hash,
      signature,
    );
  }

  public vote(choiceIndex: number, member: BrightChainMember): Buffer {
    if (choiceIndex < 0 || choiceIndex >= this.choices.length) {
      throw new Error(`Invalid option index ${choiceIndex}`);
    }
    // vote a 1 for the selected candidate and a 0 for all others
    for (let i = 0; i < this.choices.length; i++) {
      if (i == choiceIndex) {
        this.votes[i] = this.paillierKeyPair.publicKey.addition(
          this.votes[i],
          this.paillierKeyPair.publicKey.encrypt(1n),
        );
      } else {
        this.votes[i] = this.paillierKeyPair.publicKey.addition(
          this.votes[i],
          this.paillierKeyPair.publicKey.encrypt(0n),
        );
      }
    }
    return this.generateEncryptedReceipt(member);
  }

  public get tallies(): bigint[] {
    return this.votes.map((encryptedVote) =>
      this.paillierKeyPair.privateKey.decrypt(encryptedVote),
    );
  }

  public getTally(choiceIndex: number): bigint {
    return this.paillierKeyPair.privateKey.decrypt(this.votes[choiceIndex]);
  }

  public get leadingChoice(): string {
    const tallies = this.tallies;
    let leadingOptionIndex = 0;
    for (let i = 1; i < tallies.length; i++) {
      if (tallies[i] > tallies[leadingOptionIndex]) {
        leadingOptionIndex = i;
      }
    }
    return this.choices[leadingOptionIndex];
  }

  public static newPoll(
    choices: string[],
    paillierKeyPair: PaillierKeyPair,
    ecKeyPair: ECKeyPairBuffer,
  ): VotingPoll {
    const votes = new Array<bigint>(choices.length);
    for (let i = 0; i < choices.length; i++) {
      votes[i] = paillierKeyPair.publicKey.encrypt(0n);
    }

    return new VotingPoll(choices, paillierKeyPair, ecKeyPair, votes);
  }

  public static newPollWithKeys(choices: string[]): {
    poll: VotingPoll;
    paillierKeyPair: PaillierKeyPair;
    ecKeyPair: ECKeyPairBuffer;
  } {
    const paillierKeyPair =
      ServiceProvider.getInstance().votingService.generateVotingKeyPair();
    const mnemonic =
      ServiceProvider.getInstance().eciesService.generateNewMnemonic();
    const ecKeyPair =
      ServiceProvider.getInstance().eciesService.mnemonicToSimpleKeyPairBuffer(
        mnemonic,
      ) as ECKeyPairBuffer;
    const poll = VotingPoll.newPoll(choices, paillierKeyPair, ecKeyPair);
    return { poll, paillierKeyPair, ecKeyPair };
  }
}
