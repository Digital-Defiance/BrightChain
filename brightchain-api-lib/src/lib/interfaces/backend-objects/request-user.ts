import { StringLanguage } from '@brightchain/brightchain-lib';
import { Types } from 'mongoose';
import { IRequestUser } from '../request-user';
import { IRoleBackendObject } from './role';

export type IRequestUserBackendObject = IRequestUser<
  Types.ObjectId,
  Array<IRoleBackendObject>,
  StringLanguage,
  Date
>;
