import { ModelName } from '../enumerations/model-name';
import { UserRoleSchema } from '../schemas/user-role';

// Datastore-agnostic placeholder model descriptor
const UserRoleModel = {
  modelName: ModelName.UserRole,
  schema: UserRoleSchema,
} as const;
export default UserRoleModel;
