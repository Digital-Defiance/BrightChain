import {
  ServiceProvider,
  type IAppSubsystemPlugin,
  type ISubsystemContext,
} from '@brightchain/brightchain-lib';
import { BrightDb } from '@brightchain/db';
import {
  createBurnbagDeps,
  isBurnbagJouleEnabled,
  type IBurnbagExternalDeps,
} from '@brightchain/digitalburnbag-api-lib';
import { BrightDBName, BrightDBPoolID } from '@brightchain/digitalburnbag-lib';
import type { PlatformID } from '@digitaldefiance/node-ecies-lib';
import { debugLog } from '@digitaldefiance/node-express-suite';
import type { DebitAuthorizationService } from '../../joule/debitAuthorization';

/**
 * Digital Burnbag subsystem plugin.
 *
 * Extracts the Digital Burnbag file platform initialization block from
 * App.start() into a self-contained plugin. Creates burnbag dependencies
 * using `createBurnbagDeps` and mounts routes via
 * `apiRouter.mountDigitalBurnbagRoutes`.
 *
 * @see Requirements 9.1, 9.2, 9.3
 */
export class BurnbagSubsystemPlugin implements IAppSubsystemPlugin {
  public readonly name = 'burnbag';
  public readonly isOptional = true;

  public async initialize(context: ISubsystemContext): Promise<void> {
    if (!context.apiRouter) {
      return;
    }

    const burnbagDb = new BrightDb(context.blockStore, {
      name: BrightDBName,
      poolId: BrightDBPoolID,
    });

    const sp = ServiceProvider.getInstance<PlatformID>();
    const idProv = sp.idProvider;

    const burnbagExternalDeps: IBurnbagExternalDeps<PlatformID> = {
      generateId: idProv.generateTyped.bind(idProv) as () => PlatformID,
      idToString: (id: PlatformID) => idProv.idToString(id),
      parseId: (idString: string) => idProv.idFromString(idString),
      parseSafeId: (idString: string) => idProv.parseSafe(idString),
    };

    // Wire Joule debit-authorization when the feature flag is on.
    // The DebitAuthorizationService is created in App.start() and registered
    // in the service container before subsystem plugins are initialized.
    if (isBurnbagJouleEnabled() && context.services.has('debitAuthService')) {
      const debitAuth =
        context.services.get<DebitAuthorizationService>('debitAuthService');

      burnbagExternalDeps.debitAuth = debitAuth;

      // resolveChecksum: convert a string userId → Checksum for the debit layer.
      // Mirrors the pattern used in AdminJouleController.resolveMemberChecksum().
      burnbagExternalDeps.resolveChecksum = (userId: string) => {
        const typedId = sp.idProvider.idFromString(userId);
        const idRawBytes = sp.idProvider.toBytes(typedId);
        return sp.checksumService.calculateChecksum(idRawBytes);
      };
    }

    const burnbagDeps = createBurnbagDeps<PlatformID>(
      burnbagDb,
      burnbagExternalDeps,
    );
    context.apiRouter.mountDigitalBurnbagRoutes(burnbagDeps);

    // Register burnbag services in the service container so other subsystems
    // (e.g. BrightChat server icons) can use them.
    context.services.register(
      'burnbagVaultContainerService',
      () => burnbagDeps.vaultContainerService,
    );
    context.services.register(
      'burnbagUploadService',
      () => burnbagDeps.uploadService,
    );
    context.services.register(
      'burnbagFileService',
      () => burnbagDeps.fileService,
    );
    context.services.register('burnbagParseId', () => burnbagDeps.parseId);

    debugLog(
      context.environment.debug,
      'log',
      '[ ready ] Digital Burnbag file platform routes mounted',
    );
  }
}
