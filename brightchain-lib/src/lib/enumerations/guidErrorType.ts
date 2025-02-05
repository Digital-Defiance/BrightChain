import { StringNames } from './stringNames';

export enum GuidErrorType {
  Invalid = 'Invalid',
  InvalidWithGuid = 'InvalidWithGuid',
  UnknownBrand = 'UnknownBrand',
  UnknownLength = 'UnknownLength',
}

export const GuidErrorTypes: { [key in GuidErrorType]: StringNames } = {
  [GuidErrorType.Invalid]: StringNames.Error_InvalidGuid,
  [GuidErrorType.InvalidWithGuid]: StringNames.Error_InvalidGuidTemplate,
  [GuidErrorType.UnknownBrand]:
    StringNames.Error_InvalidGuidUnknownBrandTemplate,
  [GuidErrorType.UnknownLength]:
    StringNames.Error_InvalidGuidUnknownLengthTemplate,
};
