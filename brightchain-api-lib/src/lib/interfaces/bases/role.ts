import { IRoleBase } from '@digitaldefiance/suite-core-lib';
import type { BrightDateTimestamp } from '@brightchain/brightchain-lib';
import { DefaultBackendIdType } from '../../shared-types';

export type IRoleBackend = IRoleBase<DefaultBackendIdType, BrightDateTimestamp>;
