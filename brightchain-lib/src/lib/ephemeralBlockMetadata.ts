/* eslint-disable @typescript-eslint/no-explicit-any */
import { GuidV4 } from '@digitaldefiance/ecies-lib';
import { BlockMetadata } from './blockMetadata';
import { BrightChainMember } from './brightChainMember';
import { BlockDataType } from './enumerations/blockDataType';
import { BlockSize } from './enumerations/blockSize';
import { BlockType } from './enumerations/blockType';
import { BlockValidationErrorType } from './enumerations/blockValidationErrorType';
import { BlockValidationError } from './errors/block';
import { IEphemeralBlockMetadata } from './interfaces/blocks/metadata/ephemeralBlockMetadata';

export class EphemeralBlockMetadata
  extends BlockMetadata
  implements IEphemeralBlockMetadata
{
  private readonly _creator: BrightChainMember;
  constructor(
    size: BlockSize,
    type: BlockType,
    dataType: BlockDataType,
    lengthWithoutPadding: number,
    creator: BrightChainMember,
    dateCreated?: Date,
  ) {
    super(size, type, dataType, lengthWithoutPadding, dateCreated);
    this._creator = creator;
  }
  public get creator(): BrightChainMember {
    return this._creator;
  }

  public override toJson(): string {
    return JSON.stringify({
      size: this.size,
      type: this.type,
      dataType: this.dataType,
      lengthWithoutPadding: this.lengthWithoutPadding,
      dateCreated: this.dateCreated,
      creator: this.creator.guidId.serialize(),
    });
  }

  public static override fromJsonValidator(data: any): void {
    super.fromJsonValidator(data);
    if (!data.creator) {
      throw new BlockValidationError(BlockValidationErrorType.InvalidCreator);
    }
  }

  public static override fromJsonAdditionalData<T extends Record<string, any>>(
    data: any,
    hydrateCreator: (id: GuidV4) => BrightChainMember = (id: GuidV4) => {
      void id;
      throw new Error(
        'Cannot hydrate creator without a hydrateCreator function',
      );
    },
  ): { creator: BrightChainMember } & T {
    return {
      ...super.fromJsonAdditionalData<T>(data),
      creator: hydrateCreator(GuidV4.hydrate(data.creator)),
    } as { creator: BrightChainMember } & T;
  }

  public static override fromJson<
    B extends EphemeralBlockMetadata,
    T extends Record<string, any>,
  >(json: string): EphemeralBlockMetadata & T {
    return super.fromJson<B, { creator: BrightChainMember }>(json) as B & T;
  }
}
