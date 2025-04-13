import { Schema } from 'mongoose';
import { IUsedDirectLoginTokenDocument } from '../documents/used-direct-login-token';
export const UsedDirectLoginTokenSchema =
  new Schema<IUsedDirectLoginTokenDocument>({
    userId: { type: Schema.Types.ObjectId as any, required: true, ref: 'User' },
    token: { type: String, required: true },
  });

UsedDirectLoginTokenSchema.index({ userId: 1, token: 1 }, { unique: true });
