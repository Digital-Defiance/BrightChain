import { EmailTokenType, IEmailTokenBase } from '@brightchain/brightchain-lib';
import { Types } from 'mongoose';

export type IEmailTokenBackendObject = IEmailTokenBase<
  Types.ObjectId,
  Date,
  EmailTokenType
>;
