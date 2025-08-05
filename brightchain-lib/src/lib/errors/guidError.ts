import { GuidBrandType } from '../enumerations/guidBrandType';
import { GuidErrorType } from '../enumerations/guidErrorType';
import { StringLanguages } from '../enumerations/stringLanguages';
import StringNames from '../enumerations/stringNames';
import { RawGuidBuffer } from '../types';
import { TypedError } from './typedError';

export class GuidError extends TypedError<GuidErrorType> {
  public readonly brand?: GuidBrandType;
  public readonly length?: number;
  public readonly guid?: Buffer;
  protected get reasonMap(): Record<GuidErrorType, StringNames> {
    return {
      [GuidErrorType.Invalid]: StringNames.Error_InvalidGuid,
      [GuidErrorType.InvalidWithGuid]: StringNames.Error_InvalidGuidTemplate,
      [GuidErrorType.UnknownBrand]:
        StringNames.Error_InvalidGuidUnknownBrandTemplate,
      [GuidErrorType.UnknownLength]:
        StringNames.Error_InvalidGuidUnknownLengthTemplate,
    };
  }
  constructor(
    type: GuidErrorType,
    brand?: GuidBrandType,
    length?: number,
    guid?: RawGuidBuffer | Buffer,
    language?: StringLanguages,
  ) {
    super(type, undefined, {
      ...(brand ? { BRAND: `${brand}` } : {}),
      ...(length ? { LENGTH: `${length}` } : {}),
      ...(guid ? { GUID: guid.toString('hex') } : {}),
    });
    this.name = 'GuidError';
    this.brand = brand;
    this.length = length;
    this.guid = guid;
  }
}
