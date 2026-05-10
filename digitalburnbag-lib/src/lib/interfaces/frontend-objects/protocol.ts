import { GuidUint8Array, PhoneNumber } from '@digitaldefiance/ecies-lib';
import { CanaryCondition, SourceType } from '../../enumerations';
import { AccessBy, ThresholdUnit } from '../../shared-types';
import { ICanaryProtocolBase } from '../bases';

export type ICanaryProtocolFontendObject = ICanaryProtocolBase<
  GuidUint8Array,
  Date,
  PhoneNumber,
  AccessBy,
  SourceType,
  CanaryCondition,
  ThresholdUnit
>;
