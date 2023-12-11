import { PlatformID } from '@digitaldefiance/node-ecies-lib';
import { HealthcareRoleController } from '../controllers/api/brightchart/healthcareRoleController';
import { InvitationController } from '../controllers/api/brightchart/invitationController';
import { OrganizationController } from '../controllers/api/brightchart/organizationController';
import { IBrightChainApplication } from '../interfaces/application';
import { DefaultBackendIdType } from '../shared-types';
import { BaseRouter } from './base';

/**
 * BrightChart sub-router.
 *
 * Mounts the three BrightChart domain controllers:
 * - `/organizations`    → OrganizationController
 * - `/healthcare-roles` → HealthcareRoleController
 * - `/invitations`      → InvitationController
 *
 * Mounted by ApiRouter at `/brightchart`.
 */
export class BrightChartRouter<
  TID extends PlatformID = DefaultBackendIdType,
> extends BaseRouter<TID> {
  private readonly organizationController: OrganizationController<TID>;
  private readonly healthcareRoleController: HealthcareRoleController<TID>;
  private readonly invitationController: InvitationController<TID>;

  constructor(application: IBrightChainApplication<TID>) {
    super(application);

    this.organizationController = new OrganizationController(application);
    this.healthcareRoleController = new HealthcareRoleController(application);
    this.invitationController = new InvitationController(application);

    this.router.use('/organizations', this.organizationController.router);
    this.router.use('/healthcare-roles', this.healthcareRoleController.router);
    this.router.use('/invitations', this.invitationController.router);
  }
}
