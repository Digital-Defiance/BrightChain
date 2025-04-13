import { model } from 'mongoose';
import { RoleSchema } from '../schemas/role';
import { IRoleDocument } from '../documents/role';
import { ModelName } from '../enumerations/model-name';

const RoleModel = model<IRoleDocument>(ModelName.Role, RoleSchema);
export default RoleModel;
