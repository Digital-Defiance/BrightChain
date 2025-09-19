import { BackendMember } from '../backendMember';
import { IRoleDocument } from '../documents/role';
import { IUserDocument } from '../documents/user';
import { IUserRoleDocument } from '../documents/user-role';

export interface IServerInitResult {
  adminRole: IRoleDocument;
  adminUser: IUserDocument;
  adminUsername: string;
  adminEmail: string;
  adminMnemonic: string;
  adminPassword: string;
  adminBackupCodes: Array<string>;
  adminBurnbagMember: BackendMember;
  adminUserRole: IUserRoleDocument;
  memberRole: IRoleDocument;
  memberUser: IUserDocument;
  memberUsername: string;
  memberEmail: string;
  memberMnemonic: string;
  memberPassword: string;
  memberBackupCodes: Array<string>;
  memberBurnbagMember: BackendMember;
  memberUserRole: IUserRoleDocument;
  systemRole: IRoleDocument;
  systemUser: IUserDocument;
  systemUsername: string;
  systemEmail: string;
  systemMnemonic: string;
  systemPassword: string;
  systemBackupCodes: Array<string>;
  systemBurnbagMember: BackendMember;
  systemUserRole: IUserRoleDocument;
}
