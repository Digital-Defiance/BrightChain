import { ModelName } from '../enumerations/model-name';
import { UserSchema } from '../schemas/user';

// Datastore-agnostic placeholder model descriptor
const UserModel = { modelName: ModelName.User, schema: UserSchema } as const;
export default UserModel;
