import { GuidUint8Array } from '@digitaldefiance/ecies-lib';
import { SourceType } from '../../enumerations';
import { ICanaryChirpBase } from '../bases';

export type IChirpFrontendObject = ICanaryChirpBase<
  GuidUint8Array,
  Date,
  SourceType
>;
