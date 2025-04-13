import { ModelName } from '../enumerations/model-name';
import { EmailTokenSchema } from '../schemas/email-token';

// Datastore-agnostic placeholder model descriptor
const EmailTokenModel = {
  modelName: ModelName.EmailToken,
  schema: EmailTokenSchema,
} as const;
export default EmailTokenModel;
