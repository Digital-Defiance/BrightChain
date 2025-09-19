import {
  AccessBy,
  CanaryCondition,
  ICanaryProtocolBase,
  PhoneNumber,
  SourceType,
  ThresholdUnit,
} from '@brightchain/brightchain-lib';
import { DefaultBackendIdType } from '../../shared-types';

export type ICanaryProtocolBackend = ICanaryProtocolBase<
  DefaultBackendIdType,
  Date,
  PhoneNumber,
  AccessBy,
  SourceType,
  CanaryCondition,
  ThresholdUnit
>;
