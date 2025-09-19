import { BrightChainMember } from '../backendMember';
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
  adminBurnbagMember: BrightChainMember;
  adminUserRole: IUserRoleDocument;
  memberRole: IRoleDocument;
  memberUser: IUserDocument;
  memberUsername: string;
  memberEmail: string;
  memberMnemonic: string;
  memberPassword: string;
  memberBackupCodes: Array<string>;
  memberBurnbagMember: BrightChainMember;
  memberUserRole: IUserRoleDocument;
  systemRole: IRoleDocument;
  systemUser: IUserDocument;
  systemUsername: string;
  systemEmail: string;
  systemMnemonic: string;
  systemPassword: string;
  systemBackupCodes: Array<string>;
  systemBurnbagMember: BrightChainMember;
  systemUserRole: IUserRoleDocument;
}
