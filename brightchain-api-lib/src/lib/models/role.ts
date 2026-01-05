import { ModelName } from '../enumerations/model-name';
import { RoleSchema } from '../schemas/role';

// Datastore-agnostic placeholder model descriptor
const RoleModel = { modelName: ModelName.Role, schema: RoleSchema } as const;
export default RoleModel;
