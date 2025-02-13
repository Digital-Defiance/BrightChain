import { OwnedDataBlock } from '../blocks/ownedData';
import { RandomBlock } from '../blocks/random';
import { WhitenedBlock } from '../blocks/whitened';
import { BrightChainMember } from '../brightChainMember';
import { ITuple } from '../interfaces/tuple';
import { ServiceProvider } from '../services/service.provider';

/**
 * Tuple service access for blocks to avoid circular dependencies
 */
export class BlockTuple {
  private static getService() {
    return ServiceProvider.getTupleService();
  }

  public static getRandomBlockCount(dataLength: number): number {
    return this.getService().getRandomBlockCount(dataLength);
  }

  public static async xorSourceToPrimeWhitened(
    sourceBlock: OwnedDataBlock,
    whiteners: WhitenedBlock[],
    randomBlocks: RandomBlock[],
  ): Promise<WhitenedBlock> {
    return this.getService().xorSourceToPrimeWhitened(
      sourceBlock,
      whiteners,
      randomBlocks,
    );
  }

  public static async makeTupleFromSourceXor(
    sourceBlock: OwnedDataBlock,
    whiteners: WhitenedBlock[],
    randomBlocks: RandomBlock[],
  ): Promise<ITuple> {
    return this.getService().makeTupleFromSourceXor(
      sourceBlock,
      whiteners,
      randomBlocks,
    );
  }

  public static async xorDestPrimeWhitenedToOwned(
    creator: BrightChainMember,
    primeWhitened: WhitenedBlock,
    whiteners: WhitenedBlock[],
    randomBlocks: RandomBlock[],
  ): Promise<OwnedDataBlock> {
    return this.getService().xorDestPrimeWhitenedToOwned(
      creator,
      primeWhitened,
      whiteners,
      randomBlocks,
    );
  }
}
