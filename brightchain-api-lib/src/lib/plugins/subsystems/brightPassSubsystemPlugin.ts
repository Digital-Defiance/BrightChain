import type {
  IAppSubsystemPlugin,
  ISubsystemContext,
} from '@brightchain/brightchain-lib';
import { ChatCollectionAdapter } from '../../services/brightchat/chatStorageAdapter';
import type { VaultMetadataDocument } from '../../services/brightpass';

/**
 * BrightPass vault metadata subsystem plugin.
 *
 * Extracts the BrightPass vault metadata collection registration from
 * App.start() into a self-contained plugin. Creates a ChatCollectionAdapter
 * for the `brightpass_vaults` collection and registers it as
 * `vaultMetadataCollection` in the service container.
 *
 * @see Requirements 8.1, 8.2
 */
export class BrightPassSubsystemPlugin implements IAppSubsystemPlugin {
  public readonly name = 'brightpass';

  public async initialize(context: ISubsystemContext): Promise<void> {
    const vaultMetadataCollection =
      new ChatCollectionAdapter<VaultMetadataDocument>(
        context.getModel('brightpass_vaults'),
        'id',
      );
    context.services.register(
      'vaultMetadataCollection',
      () => vaultMetadataCollection,
    );
  }
}
