import type { BrightDateTimestamp } from '@brightchain/brightchain-lib';
import { IRoleBase, Role } from '@digitaldefiance/suite-core-lib';
import type { DefaultBackendIdType } from '../../types/backend-id';

export type IRoleBackendObject = IRoleBase<
  DefaultBackendIdType,
  BrightDateTimestamp,
  Role
>;
