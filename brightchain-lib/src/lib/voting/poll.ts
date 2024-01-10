import { KeyPair as PaillierKeyPair } from 'paillier-bigint';
import { SimpleKeyPairBuffer as ECKeyPairBuffer, SignatureBuffer } from '../types';
import { createHash, randomBytes } from 'crypto';
import { EthereumECIES } from '../ethereumECIES';
import { BrightChainMember } from '../brightChainMember';
export class VotingPoll {
  public readonly choices: string[];
  public readonly votes: bigint[];
  public readonly paillierKeyPair: PaillierKeyPair;
  public readonly ecKeyPair: ECKeyPairBuffer;
  public readonly receipts: Set<Buffer> = new Set<Buffer>();
  constructor(choices: string[], paillierKeyPair: PaillierKeyPair, ecKeyPair: ECKeyPairBuffer, votes: bigint[]) {
    this.choices = choices;
    this.paillierKeyPair = paillierKeyPair;
    this.ecKeyPair = ecKeyPair;
    this.votes = votes;
  }
  public generateEncryptedReceipt(member: BrightChainMember): Buffer {
    const randomNonce = randomBytes(16).toString('hex');
    const hash = Buffer.from(createHash('sha256').update(`${Date.now()}-${randomNonce}-${member.id.asShortHexGuid}`).digest('hex'), 'hex');
    const signature = EthereumECIES.signMessage(this.ecKeyPair.privateKey, hash);
    const receipt = Buffer.concat([hash, signature]);
    this.receipts.add(receipt);
    const encryptedReceipt = EthereumECIES.encrypt(member.publicKey, receipt);
    return encryptedReceipt;
  }
  public verifyReceipt(receipt: Buffer): boolean {
    if (this.receipts.has(receipt)) {
      return true;
    }
    const hash = receipt.subarray(0, 32);
    const signature = receipt.subarray(32) as SignatureBuffer;
    const verified = EthereumECIES.verifyMessage(this.ecKeyPair.publicKey, hash, signature);
    if (verified) {
      this.receipts.add(receipt);
    }
    return verified;
  }
  public vote(choiceIndex: number, member: BrightChainMember): Buffer {
    if (choiceIndex < 0 || choiceIndex >= this.choices.length) {
      throw new Error(`Invalid option index ${choiceIndex}`);
    }
    // vote a 1 for the selected candidate and a 0 for all others
    for (let i = 0; i < this.choices.length; i++) {
      if (i == choiceIndex) {
        this.votes[i] = this.paillierKeyPair.publicKey.addition(this.votes[i], this.paillierKeyPair.publicKey.encrypt(1n));
      } else {
        this.votes[i] = this.paillierKeyPair.publicKey.addition(this.votes[i], this.paillierKeyPair.publicKey.encrypt(0n));
      }
    }
    return this.generateEncryptedReceipt(member);
  }
  public get tallies(): bigint[] {
    return this.votes.map(encryptedVote => this.paillierKeyPair.privateKey.decrypt(encryptedVote));
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
  public static newPoll(choices: string[], paillierKeyPair: PaillierKeyPair, ecKeyPair: ECKeyPairBuffer): VotingPoll {
    const votes = new Array<bigint>(choices.length);
    for (let i = 0; i < choices.length; i++) {
      votes[i] = paillierKeyPair.publicKey.encrypt(0n);
    }

    return new VotingPoll(choices, paillierKeyPair, ecKeyPair, votes);
  }
}