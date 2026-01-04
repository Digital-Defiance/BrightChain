import { IRoleBase } from '@digitaldefiance/suite-core-lib';
import { Types } from 'mongoose';

export type IRoleBackend = IRoleBase<Types.ObjectId, Date>;
