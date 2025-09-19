import { IRoleBase, Role } from '@brightchain/brightchain-lib';
import { Types } from 'mongoose';

export type IRoleBackendObject = IRoleBase<Types.ObjectId, Date, Role>;
