import { IRoleBase } from '@brightchain/brightchain-lib';
import { Types } from 'mongoose';

export type IRoleBackend = IRoleBase<Types.ObjectId, Date>;
