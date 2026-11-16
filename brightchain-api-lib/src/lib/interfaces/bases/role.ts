import type { BrightDateTimestamp } from '@brightchain/brightchain-lib';
import { IRoleBase } from '@digitaldefiance/suite-core-lib';
import { DefaultBackendIdType } from '../../shared-types';

export type IRoleBackend = IRoleBase<DefaultBackendIdType, BrightDateTimestamp>;
