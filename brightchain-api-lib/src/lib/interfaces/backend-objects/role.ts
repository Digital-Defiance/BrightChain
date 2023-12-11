import { IRoleBase, Role } from '@digitaldefiance/suite-core-lib';
import type { DefaultBackendIdType } from '../../types/backend-id';

export type IRoleBackendObject = IRoleBase<DefaultBackendIdType, Date, Role>;
