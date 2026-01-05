import { model } from 'mongoose';
import { IUserRoleDocument } from '../documents/user-role';
import { ModelName } from '../enumerations/model-name';
import { UserRoleSchema } from '../schemas/user-role';

const UserRoleModel = model<IUserRoleDocument>(
  ModelName.UserRole,
  UserRoleSchema,
);
export default UserRoleModel;
