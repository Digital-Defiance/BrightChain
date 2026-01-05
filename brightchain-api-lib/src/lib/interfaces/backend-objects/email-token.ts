import {
  EmailTokenType,
  IEmailTokenBase,
} from '@digitaldefiance/suite-core-lib';
import { Types } from 'mongoose';

export type IEmailTokenBackendObject = IEmailTokenBase<
  Types.ObjectId,
  Date,
  EmailTokenType
>;
