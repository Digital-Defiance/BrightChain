import type { BrightDateTimestamp } from '@brightchain/brightchain-lib';
import { IUserRoleBase } from '@digitaldefiance/suite-core-lib';
import { DefaultBackendIdType } from '../../shared-types';

export type IUserRoleBackend = IUserRoleBase<
  DefaultBackendIdType,
  BrightDateTimestamp
>;
