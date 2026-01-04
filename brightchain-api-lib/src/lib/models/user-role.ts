import { model } from 'mongoose';
import { UserRoleSchema } from '../schemas/user-role';
import { IUserRoleDocument } from '../documents/user-role';
import { ModelName } from '../enumerations/model-name';

const UserRoleModel = model<IUserRoleDocument>(ModelName.UserRole, UserRoleSchema);
export default UserRoleModel;
