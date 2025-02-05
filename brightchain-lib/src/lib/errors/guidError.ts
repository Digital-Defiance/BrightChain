import { GuidBrandType } from '../enumerations/guidBrandType';
import { GuidErrorType, GuidErrorTypes } from '../enumerations/guidErrorType';
import { StringLanguages } from '../enumerations/stringLanguages';
import { translate } from '../i18n';
import { RawGuidBuffer } from '../types';
import { HandleableError } from './handleable';

export class GuidError extends HandleableError {
  public readonly reason: GuidErrorType;
  public readonly brand?: GuidBrandType;
  public readonly length?: number;
  public readonly guid?: RawGuidBuffer;
  constructor(
    reason: GuidErrorType,
    brand?: GuidBrandType,
    length?: number,
    guid?: RawGuidBuffer,
    language?: StringLanguages,
  ) {
    super(
      translate(GuidErrorTypes[reason], language, {
        ...(brand ? { BRAND: `${brand}` } : {}),
        ...(length ? { LENGTH: `${length}` } : {}),
        ...(guid ? { GUID: guid.toString('hex') } : {}),
      }),
    );
    this.name = 'GuidError';
    this.reason = reason;
    this.brand = brand;
  }
}
