import { DefaultBackendIdType } from '../../shared-types';
import { IRequestUser, StringLanguage } from '../request-user';
import { IRoleBackendObject } from './role';

export type IRequestUserBackendObject = IRequestUser<
  DefaultBackendIdType,
  Array<IRoleBackendObject>,
  StringLanguage,
  Date
>;
