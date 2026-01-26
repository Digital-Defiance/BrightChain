import type { DefaultBackendIdType } from '../../types/backend-id';
import { IRequestUser, StringLanguage } from '../request-user';
import { IRoleBackendObject } from './role';

export type IRequestUserBackendObject = IRequestUser<
  DefaultBackendIdType,
  Array<IRoleBackendObject>,
  StringLanguage,
  Date
>;
