import { ModelName, SchemaCollection } from '@brightchain/brightchain-lib';
import { Connection } from 'mongoose';
import EmailTokenModel from '../models/email-token';
import MnemonicModel from '../models/mnemonic';
import RoleModel from '../models/role';
import UsedDirectLoginTokenModel from '../models/used-direct-login-token';
import UserModel from '../models/user';
import UserRoleModel from '../models/user-role';
import { SchemaMap } from '../shared-types';
import { EmailTokenSchema } from './email-token';
import { MnemonicSchema } from './mnemonic';
import { RoleSchema } from './role';
import { UsedDirectLoginTokenSchema } from './used-direct-login-token';
import { UserSchema } from './user';
import { UserRoleSchema } from './user-role';

export function getSchemaMap(connection: Connection): SchemaMap {
  return {
    /**
     * Model/Collection for email tokens sent to users
     */
    EmailToken: {
      collection: SchemaCollection.EmailToken,
      model: EmailTokenModel(connection),
      modelName: ModelName.EmailToken,
      schema: EmailTokenSchema,
    },
    /**
     * Model/Collection for mnemonics used for user authentication
     */
    Mnemonic: {
      collection: SchemaCollection.Mnemonic,
      model: MnemonicModel(connection),
      modelName: ModelName.Mnemonic,
      schema: MnemonicSchema,
    },
    /**
     * Model/Collection for roles in the application
     */
    Role: {
      collection: SchemaCollection.Role,
      model: RoleModel(connection),
      modelName: ModelName.Role,
      schema: RoleSchema,
    },
    UsedDirectLoginToken: {
      collection: SchemaCollection.UsedDirectLoginToken,
      model: UsedDirectLoginTokenModel(connection),
      modelName: ModelName.UsedDirectLoginToken,
      schema: UsedDirectLoginTokenSchema,
    },
    /**
     * Model/Collection for users in the application
     */
    User: {
      collection: SchemaCollection.User,
      model: UserModel(connection),
      modelName: ModelName.User,
      schema: UserSchema,
    },
    /**
     * Model/Collection for user-role relationships
     */
    UserRole: {
      collection: SchemaCollection.UserRole,
      model: UserRoleModel(connection),
      modelName: ModelName.UserRole,
      schema: UserRoleSchema,
    },
  };
}
