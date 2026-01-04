import { model } from 'mongoose';
import { EmailTokenSchema } from '../schemas/email-token';
import { IEmailTokenDocument } from '../documents/email-token';
import { ModelName } from '../enumerations/model-name';

const EmailTokenModel = model<IEmailTokenDocument>(ModelName.EmailToken, EmailTokenSchema);
export default EmailTokenModel;
