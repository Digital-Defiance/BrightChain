import { model } from 'mongoose';
import { IRoleDocument } from '../documents/role';
import { ModelName } from '../enumerations/model-name';
import { RoleSchema } from '../schemas/role';

const RoleModel = model<IRoleDocument>(ModelName.Role, RoleSchema);
export default RoleModel;
