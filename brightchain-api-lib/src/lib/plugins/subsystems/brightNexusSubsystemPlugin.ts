import {
  ServiceProvider,
  type IAppSubsystemPlugin,
  type ISubsystemContext,
} from '@brightchain/brightchain-lib';
import {
  BrightNexusBrightDBName,
  BrightNexusBrightDBPoolID,
} from '@brightchain/brightnexus-lib';
import {
  createBrightNexusDeps,
  type IBrightNexusExternalDeps,
} from '@brightchain/brightnexus-api-lib';
import { BrightDb } from '@brightchain/db';
import type { PlatformID } from '@digitaldefiance/node-ecies-lib';
import { debugLog } from '@digitaldefiance/node-express-suite';

/**
 * BrightNexus geo registry subsystem — BSLP DHT publication tier on BrightDB.
 *
 * Authenticated members publish IP → BrightSpacetime vectors with optional
 * Heisenberg fuzz; public lookup feeds bcurl / bwget / brightdate-rust.
 */
export class BrightNexusSubsystemPlugin implements IAppSubsystemPlugin {
  public readonly name = 'brightnexus';
  public readonly isOptional = true;

  public async initialize(context: ISubsystemContext): Promise<void> {
    if (!context.apiRouter) {
      return;
    }

    const nexusDb = new BrightDb(context.blockStore, {
      name: BrightNexusBrightDBName,
      poolId: BrightNexusBrightDBPoolID,
    });

    const sp = ServiceProvider.getInstance<PlatformID>();
    const idProv = sp.idProvider;

    const memberStore = context.memberStore as {
      getMemberPublicKeyHex: (id: PlatformID) => Promise<string | null>;
    };

    const external: IBrightNexusExternalDeps<PlatformID> = {
      generateId: idProv.generateTyped.bind(idProv) as () => PlatformID,
      idToString: (id: PlatformID) => idProv.idToString(id),
      parseId: (idString: string) => idProv.idFromString(idString),
      parseSafeId: (idString: string) => idProv.parseSafe(idString),
      getMemberPublicKeyHex: (memberId: PlatformID) =>
        memberStore.getMemberPublicKeyHex(memberId),
      getMemberPublicKeyHexByIdString: async (memberIdHex: string) => {
        try {
          const memberId = idProv.idFromString(memberIdHex);
          return memberStore.getMemberPublicKeyHex(memberId);
        } catch {
          return null;
        }
      },
    };

    const deps = createBrightNexusDeps(nexusDb, external);
    context.apiRouter.mountBrightNexusRoutes(deps);

    context.services.register(
      'brightNexusLocationRegistry',
      () => deps.locationRegistryService,
    );

    debugLog(
      context.environment.debug,
      'log',
      '[ ready ] BrightNexus geo registry (BSLP DHT) routes mounted',
    );
  }
}
