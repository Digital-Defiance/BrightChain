import { ICanaryChirpBase, SourceType } from '@brightchain/brightchain-lib';
import { DefaultBackendIdType } from '../../shared-types';

export type ICanaryChirpBackend = ICanaryChirpBase<
  DefaultBackendIdType,
  Date,
  SourceType
>;
