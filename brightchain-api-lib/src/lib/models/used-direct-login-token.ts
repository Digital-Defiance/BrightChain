import { ModelName } from '../enumerations/model-name';
import { UsedDirectLoginTokenSchema } from '../schemas/used-direct-login-token';

// Datastore-agnostic placeholder model descriptor
const UsedDirectLoginTokenModel = {
  modelName: ModelName.UsedDirectLoginToken,
  schema: UsedDirectLoginTokenSchema,
} as const;
export default UsedDirectLoginTokenModel;
