import { model } from 'mongoose';
import { UsedDirectLoginTokenSchema } from '../schemas/used-direct-login-token';
import { IUsedDirectLoginTokenDocument } from '../documents/used-direct-login-token';
import { ModelName } from '../enumerations/model-name';

const UsedDirectLoginTokenModel = model<IUsedDirectLoginTokenDocument>(ModelName.UsedDirectLoginToken, UsedDirectLoginTokenSchema);
export default UsedDirectLoginTokenModel;
