import { DefaultIdType } from '@brightchain/brightchain-lib';
import { PlatformID } from '@digitaldefiance/node-ecies-lib';
import { AbstractRoleService } from '@brightchain/node-express-suite';
import { IRoleBase, ITokenRole } from '@digitaldefiance/suite-core-lib';
import { IBrightChainApplication } from '../interfaces';
import { DefaultBackendIdType } from '../shared-types';

/**
 * BrightChain role service.
 * Extends the storage-agnostic AbstractRoleService and provides
 * BrightDb-specific implementations for role lookups.
 *
 * TODO: Wire up to BrightDb document store when role storage is implemented.
 */
export class RoleService<
  TID extends PlatformID = DefaultBackendIdType,
  TDate extends Date = Date,
  TTokenRole extends ITokenRole<TID, TDate> = ITokenRole<TID, TDate>,
  TRole extends IRoleBase<TID> = IRoleBase<TID>,
> extends AbstractRoleService<TID, TDate, TTokenRole, TRole, IBrightChainApplication<TID>> {
  constructor(application: IBrightChainApplication<TID>) {
    super(application);
  }

  public async getRoleIdByName(
    _roleName: string,
  ): Promise<TID | null | undefined> {
    // TODO: implement with BrightDb role storage
    return null;
  }

  public async getUserRoles(_userId: TID): Promise<TRole[]> {
    // TODO: implement with BrightDb role storage
    return [];
  }

  public rolesToTokenRoles(
    _roles: TRole[],
    _overrideLanguage?: string,
  ): TTokenRole[] {
    // TODO: implement with BrightDb role storage
    return [];
  }
}
