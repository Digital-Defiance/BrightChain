import { model } from 'mongoose';
import { UserSchema } from '../schemas/user';
import { IUserDocument } from '../documents/user';
import { ModelName } from '../enumerations/model-name';

const UserModel = model<IUserDocument>(ModelName.User, UserSchema);
export default UserModel;
