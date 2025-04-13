import { IRoleBase, Role } from '@digitaldefiance/suite-core-lib';
import { DefaultBackendIdType } from '../../shared-types';

export type IRoleBackendObject = IRoleBase<DefaultBackendIdType, Date, Role>;
