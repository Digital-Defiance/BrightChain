/* eslint-disable @typescript-eslint/no-explicit-any */
import { Constants, Member, type PlatformID } from '@digitaldefiance/ecies-lib';
import { BlockMetadata } from './blockMetadata';
import { BlockDataType } from './enumerations/blockDataType';
import { BlockSize } from './enumerations/blockSize';
import { BlockType } from './enumerations/blockType';
import { BlockValidationErrorType } from './enumerations/blockValidationErrorType';
import { BlockValidationError } from './errors/block';
import { IEphemeralBlockMetadata } from './interfaces/blocks/metadata/ephemeralBlockMetadata';

export class EphemeralBlockMetadata<TID extends PlatformID = Uint8Array>
  extends BlockMetadata
  implements IEphemeralBlockMetadata<TID>
{
  private readonly _creator: Member<TID>;
  constructor(
    size: BlockSize,
    type: BlockType,
    dataType: BlockDataType,
    lengthWithoutPadding: number,
    creator: Member<TID>,
    dateCreated?: Date,
  ) {
    super(size, type, dataType, lengthWithoutPadding, dateCreated);
    this._creator = creator;
  }
  public get creator(): Member<TID> {
    return this._creator;
  }

  public override toJson(): string {
    return JSON.stringify({
      size: this.size,
      type: this.type,
      dataType: this.dataType,
      lengthWithoutPadding: this.lengthWithoutPadding,
      dateCreated: this.dateCreated,
      creator: Constants.idProvider.serialize(this.creator.idBytes),
    });
  }

  public static override fromJsonValidator(data: any): void {
    super.fromJsonValidator(data);
    if (!data.creator) {
      throw new BlockValidationError(BlockValidationErrorType.InvalidCreator);
    }
  }

  public static override fromJsonAdditionalData<
    T extends Record<string, any>,
    TID extends PlatformID = Uint8Array,
  >(data: any): { creator: Member<TID> } & T {
    return {
      ...super.fromJsonAdditionalData<T>(data),
      creator: Constants.idProvider.fromBytes(
        Constants.idProvider.deserialize(data.creator),
      ) as Member<TID>,
    } as { creator: Member<TID> } & T;
  }

  public static override fromJson<
    B extends EphemeralBlockMetadata,
    T extends Record<string, any> & { creator?: Member<TID> },
    TID extends PlatformID = Uint8Array,
  >(json: string): EphemeralBlockMetadata & T {
    return super.fromJson<B, { creator: Member<TID> }>(json) as B & T;
  }
}
