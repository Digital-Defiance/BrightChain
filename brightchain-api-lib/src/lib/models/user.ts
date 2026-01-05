import { model } from 'mongoose';
import { IUserDocument } from '../documents/user';
import { ModelName } from '../enumerations/model-name';
import { UserSchema } from '../schemas/user';

const UserModel = model<IUserDocument>(ModelName.User, UserSchema);
export default UserModel;
