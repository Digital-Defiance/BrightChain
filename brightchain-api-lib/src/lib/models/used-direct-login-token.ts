import { model } from 'mongoose';
import { IUsedDirectLoginTokenDocument } from '../documents/used-direct-login-token';
import { ModelName } from '../enumerations/model-name';
import { UsedDirectLoginTokenSchema } from '../schemas/used-direct-login-token';

const UsedDirectLoginTokenModel = model<IUsedDirectLoginTokenDocument>(
  ModelName.UsedDirectLoginToken,
  UsedDirectLoginTokenSchema,
);
export default UsedDirectLoginTokenModel;
