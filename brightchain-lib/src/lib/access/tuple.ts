import { EphemeralBlock } from '../blocks/ephemeral';
import { RandomBlock } from '../blocks/random';
import { WhitenedBlock } from '../blocks/whitened';
import { BrightChainMember } from '../brightChainMember';
import { IEphemeralBlock } from '../interfaces/blocks/ephemeral';
import { ITuple } from '../interfaces/tuple';
import { ServiceProvider } from '../services/service.provider';

/**
 * Tuple service access for blocks to avoid circular dependencies
 */
export class BlockTuple {
  public static getRandomBlockCount(dataLength: number): number {
    return ServiceProvider.getInstance().tupleService.getRandomBlockCount(
      dataLength,
    );
  }

  public static async xorSourceToPrimeWhitened(
    sourceBlock: EphemeralBlock,
    whiteners: WhitenedBlock[],
    randomBlocks: RandomBlock[],
  ): Promise<WhitenedBlock> {
    return ServiceProvider.getInstance().tupleService.xorSourceToPrimeWhitened(
      sourceBlock,
      whiteners,
      randomBlocks,
    );
  }

  public static async makeTupleFromSourceXor(
    sourceBlock: EphemeralBlock,
    whiteners: WhitenedBlock[],
    randomBlocks: RandomBlock[],
  ): Promise<ITuple> {
    return ServiceProvider.getInstance().tupleService.makeTupleFromSourceXor(
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
  ): Promise<IEphemeralBlock> {
    return ServiceProvider.getInstance().tupleService.xorDestPrimeWhitenedToOwned(
      creator,
      primeWhitened,
      whiteners,
      randomBlocks,
    );
  }
}
