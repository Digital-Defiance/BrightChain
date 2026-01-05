import { model } from 'mongoose';
import { IEmailTokenDocument } from '../documents/email-token';
import { ModelName } from '../enumerations/model-name';
import { EmailTokenSchema } from '../schemas/email-token';

const EmailTokenModel = model<IEmailTokenDocument>(
  ModelName.EmailToken,
  EmailTokenSchema,
);
export default EmailTokenModel;
