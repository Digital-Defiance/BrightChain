import { Member, PlatformID } from '@digitaldefiance/ecies-lib';
import { EphemeralBlock } from '../blocks/ephemeral';
import { RandomBlock } from '../blocks/random';
import { WhitenedBlock } from '../blocks/whitened';
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

  public static async xorDestPrimeWhitenedToOwned<
    TID extends PlatformID = Uint8Array,
  >(
    creator: Member<TID>,
    primeWhitened: WhitenedBlock,
    whiteners: WhitenedBlock[],
    randomBlocks: RandomBlock[],
  ): Promise<IEphemeralBlock<TID>> {
    return ServiceProvider.getInstance<TID>().tupleService.xorDestPrimeWhitenedToOwned(
      creator,
      primeWhitened,
      whiteners,
      randomBlocks,
    ) as Promise<IEphemeralBlock<TID>>;
  }
}
