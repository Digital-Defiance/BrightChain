import { IRoleBase, Role } from '@digitaldefiance/suite-core-lib';
import { Types } from 'mongoose';

export type IRoleBackendObject = IRoleBase<Types.ObjectId, Date, Role>;
