import {
  ServiceProvider,
  type IAppSubsystemPlugin,
  type ISubsystemContext,
} from '@brightchain/brightchain-lib';
import { BrightDb } from '@brightchain/db';
import {
  createBurnbagDeps,
  type IBurnbagExternalDeps,
} from '@brightchain/digitalburnbag-api-lib';
import { BrightDBName, BrightDBPoolID } from '@brightchain/digitalburnbag-lib';
import { debugLog } from '@digitaldefiance/node-express-suite';
import type { PlatformID } from '@digitaldefiance/node-ecies-lib';

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

    const idProv =
      ServiceProvider.getInstance<PlatformID>().idProvider;
    const burnbagExternalDeps: IBurnbagExternalDeps<PlatformID> = {
      generateId: idProv.generateTyped.bind(idProv) as () => PlatformID,
      idToString: (id: PlatformID) => idProv.idToString(id),
      parseId: (idString: string) => idProv.idFromString(idString),
      parseSafeId: (idString: string) => idProv.parseSafe(idString),
    };

    const burnbagDeps = createBurnbagDeps<PlatformID>(
      burnbagDb,
      burnbagExternalDeps,
    );
    context.apiRouter.mountDigitalBurnbagRoutes(burnbagDeps);

    debugLog(
      context.environment.debug,
      'log',
      '[ ready ] Digital Burnbag file platform routes mounted',
    );
  }
}
