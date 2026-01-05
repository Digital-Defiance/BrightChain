/* eslint-disable @nx/enforce-module-boundaries */
import { StringLanguage } from '@brightchain/brightchain-lib';
import { DefaultBackendIdType } from '../../shared-types';
import { IRequestUser } from '../request-user';
import { IRoleBackendObject } from './role';

export type IRequestUserBackendObject = IRequestUser<
  DefaultBackendIdType,
  Array<IRoleBackendObject>,
  StringLanguage,
  Date
>;
