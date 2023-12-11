import {
  EmailTokenType,
  IEmailTokenBase,
} from '@digitaldefiance/suite-core-lib';
import { DefaultBackendIdType } from '../../shared-types';

export type IEmailTokenBackendObject = IEmailTokenBase<
  DefaultBackendIdType,
  Date,
  EmailTokenType
>;
