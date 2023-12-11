import type {
  IAppSubsystemPlugin,
  ISubsystemContext,
} from '@brightchain/brightchain-lib';
import { debugLog } from '@digitaldefiance/node-express-suite';
import {
  ConnectionService,
  DiscoveryService,
  FeedService,
  MessagingService,
  NotificationService,
  PostService,
  UserProfileService,
} from '../../services';
import { wrapCollection } from '../../services/brighthub/collectionAdapter';
import { createThreadService } from '../../services/brighthub/threadService';

/**
 * BrightHub social services subsystem plugin.
 *
 * Extracts the BrightHub social services initialization block from
 * App.start() into a self-contained plugin. Creates all 8 social services
 * (PostService, ThreadService, FeedService, MessagingService,
 * NotificationService, ConnectionService, DiscoveryService,
 * UserProfileService) using the collection adapter pattern, registers them
 * in the service container, wires cross-service dependencies, and binds
 * routes to the ApiRouter.
 *
 * @see Requirements 6.1, 6.2, 6.3, 6.4, 6.5
 */
export class BrightHubSubsystemPlugin implements IAppSubsystemPlugin {
  public readonly name = 'brighthub';

  public async initialize(context: ISubsystemContext): Promise<void> {
    // BrightHub services expect a Collection<T> interface with
    // .findOne().exec(), .updateOne(filter, fields).exec() patterns.
    // BrightDb's DocumentCollection has a different API, so we wrap
    // each collection via CollectionAdapter (see collectionAdapter.ts).
    const appForCollections = {
      getModel<T>(name: string) {
        return wrapCollection<T>(context.getModel(name));
      },
    };

    const postService = new PostService(appForCollections);
    const threadService = createThreadService(appForCollections);
    const feedService = new FeedService(appForCollections);
    const messagingService = new MessagingService(appForCollections);
    const notificationService = new NotificationService(appForCollections);
    const connectionService = new ConnectionService(appForCollections);
    const discoveryService = new DiscoveryService(appForCollections);
    const userProfileService = new UserProfileService(appForCollections);

    // Register all 8 services in the service container
    context.services.register('postService', () => postService);
    context.services.register('threadService', () => threadService);
    context.services.register('feedService', () => feedService);
    context.services.register('messagingService', () => messagingService);
    context.services.register('notificationService', () => notificationService);
    context.services.register('connectionService', () => connectionService);
    context.services.register('discoveryService', () => discoveryService);
    context.services.register('userProfileService', () => userProfileService);

    // Wire notification service into services that create notifications
    postService.setNotificationService(notificationService);
    userProfileService.setNotificationService(notificationService);

    // Wire connection service into user profile service for block inheritance
    userProfileService.setConnectionService(connectionService);

    // Wire raw user search so searchUsers can find RBAC-seeded users
    // that live in the BrightDB Collection but not the BlockCollection.
    try {
      const db = context.brightDb;
      const usersCol = db.collection('users');
      userProfileService.setRawUserSearch(async (query, limit) => {
        const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const pattern = new RegExp(escaped, 'i');
        const cursor = usersCol.find({
          $or: [
            { username: { $regex: pattern } },
            { email: { $regex: pattern } },
          ],
        } as never);
        const results = await cursor.limit(limit).toArray();
        return results.map((u: { _id: string | unknown; username: string; email: string }) => ({
          _id: typeof u._id === 'string' ? u._id : String(u._id),
          username: u.username,
          email: u.email,
        }));
      });
    } catch {
      // BrightDB not available — raw user search disabled
    }

    // Wire all 8 services to the ApiRouter if available
    if (context.apiRouter) {
      context.apiRouter.setBrightHubPostService(postService);
      context.apiRouter.setBrightHubThreadService(threadService);
      context.apiRouter.setBrightHubFeedService(feedService);
      context.apiRouter.setBrightHubMessagingService(messagingService);
      context.apiRouter.setBrightHubNotificationService(notificationService);
      context.apiRouter.setBrightHubConnectionService(connectionService);
      context.apiRouter.setBrightHubDiscoveryService(discoveryService);
      context.apiRouter.setBrightHubUserProfileService(userProfileService);
    }

    debugLog(
      context.environment.debug,
      'log',
      '[ ready ] BrightHub social services initialized',
    );
  }
}
