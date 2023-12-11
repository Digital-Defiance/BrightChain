import type {
  IAppSubsystemPlugin,
  ISubsystemContext,
} from '@brightchain/brightchain-lib';
import { setImageLimits } from '@brightchain/brighthub-lib';
import type { PlatformID } from '@digitaldefiance/node-ecies-lib';
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
import { UrlRewriterService } from '../../services/brighthub/urlRewriterService';
import type { StagingService } from '../../services/staging/stagingService';

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
    // Apply env-var overrides for image limits (server-side only).
    // brighthub-lib defaults are used if env vars are not set.
    const env = context.environment as Record<string, unknown>;
    const maxInlineStr =
      (env['maxInlineImages'] as string | undefined) ??
      process.env['MAX_INLINE_IMAGES'];
    const maxDimStr =
      (env['maxImageDimension'] as string | undefined) ??
      process.env['MAX_IMAGE_DIMENSION'];
    setImageLimits({
      maxInlineImages: maxInlineStr ? parseInt(maxInlineStr, 10) : undefined,
      maxImageDimension: maxDimStr ? parseInt(maxDimStr, 10) : undefined,
    });
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

    // Wire UrlRewriterService into PostService for inline image commit.
    // Requires burnbag vault services (registered by BurnbagSubsystemPlugin).
    if (
      context.apiRouter &&
      context.services.has('burnbagVaultContainerService') &&
      context.services.has('burnbagUploadService') &&
      context.services.has('burnbagParseId')
    ) {
      try {
        const stagingService =
          context.apiRouter.getStagingService() as StagingService;
        const vaultContainerService = context.services.get(
          'burnbagVaultContainerService',
        ) as {
          createContainer(params: {
            name: string;
            ownerId: PlatformID;
            visibility?: string;
          }): Promise<{ id: PlatformID; rootFolderId: PlatformID }>;
          listContainers(
            ownerId: PlatformID,
          ): Promise<Array<{ container: { id: PlatformID; name: string; rootFolderId: PlatformID } }>>;
        };
        const uploadService = context.services.get(
          'burnbagUploadService',
        ) as {
          createSession(params: {
            userId: PlatformID;
            fileName: string;
            mimeType: string;
            totalSizeBytes: number;
            targetFolderId: PlatformID;
            vaultContainerId: PlatformID;
          }): Promise<{ id: PlatformID }>;
          receiveChunk(
            sessionId: PlatformID,
            chunkIndex: number,
            data: Uint8Array,
            checksum: string,
          ): Promise<unknown>;
          finalize(sessionId: PlatformID): Promise<{
            id: PlatformID;
            vaultContainerId: PlatformID;
            fileName: string;
            mimeType: string;
            sizeBytes: number;
          }>;
        };
        const parseId = context.services.get('burnbagParseId') as (
          id: string,
        ) => PlatformID;

        // In-memory registry of committed post image metadata.
        const postImageRegistry = new Map<
          string,
          { mimeType: string; authorId: string; vaultContainerId: string }
        >();

        const urlRewriter = new UrlRewriterService(
          {
            stagingService,
            vaultContainerService,
            uploadService,
            fileService: {
              softDelete: async () => {
                // Best-effort — file cleanup is non-critical for post creation
              },
            },
            parseId,
          },
          // Callback to register committed images in the serving registry
          (fileId, meta) => {
            postImageRegistry.set(fileId, meta);
          },
        );

        postService.setUrlRewriter(urlRewriter);

        // Wire PostImageController for serving committed post images
        const fileService = context.services.has('burnbagFileService')
          ? (context.services.get('burnbagFileService') as {
              getFileContent(
                fileId: PlatformID,
                requesterId: PlatformID,
                context: { ipAddress: string; timestamp: Date },
              ): Promise<ReadableStream<Uint8Array>>;
            })
          : null;

        if (fileService) {
          // Populate registry from existing posts on startup
          try {
            const postsCol = appForCollections.getModel<{
              authorId: string;
              mediaAttachments: Array<{
                _id: string;
                url: string;
                mimeType: string;
              }>;
              isDeleted: boolean;
            }>('brighthub_posts');
            const allPosts = await postsCol
              .find({} as never)
              .exec();
            for (const post of allPosts) {
              if (!post.mediaAttachments) continue;
              for (const att of post.mediaAttachments) {
                if (att._id && att.url?.startsWith('/api/post-images/')) {
                  postImageRegistry.set(att._id, {
                    mimeType: att.mimeType,
                    authorId: post.authorId,
                    vaultContainerId: att._id, // resolved by fileService
                  });
                }
              }
            }
          } catch {
            // Non-fatal — registry will be populated as new posts are created
          }

          context.apiRouter.setPostImageDeps({
            fileService: {
              readFile: async (
                _vaultContainerId: PlatformID,
                fileId: PlatformID,
              ) => {
                const fileIdStr = fileId.toString();
                const entry = postImageRegistry.get(fileIdStr);
                const ownerId = entry
                  ? parseId(entry.authorId)
                  : fileId; // fallback

                const stream = await fileService.getFileContent(
                  fileId,
                  ownerId,
                  { ipAddress: '127.0.0.1', timestamp: new Date() },
                );
                const chunks: Uint8Array[] = [];
                const reader = stream.getReader();
                for (;;) {
                  const { done, value } = await reader.read();
                  if (done) break;
                  chunks.push(value);
                }
                return Buffer.concat(chunks);
              },
            },
            parseId,
            resolveFile: async (fileId: string) => {
              const entry = postImageRegistry.get(fileId);
              if (entry) {
                return {
                  vaultContainerId: entry.vaultContainerId,
                  mimeType: entry.mimeType,
                };
              }
              return null;
            },
          });

          // Expose the registry so the UrlRewriterService can populate it
          context.services.register(
            'postImageRegistry',
            () => postImageRegistry,
            true,
          );

          debugLog(
            context.environment.debug,
            'log',
            '[ ready ] PostImageController dependencies wired',
          );
        }

        debugLog(
          context.environment.debug,
          'log',
          '[ ready ] UrlRewriterService wired to PostService',
        );
      } catch (err) {
        debugLog(
          context.environment.debug,
          'warn',
          `[ warning ] Failed to wire UrlRewriterService: ${err instanceof Error ? err.message : err}`,
        );
      }
    } else {
      debugLog(
        context.environment.debug,
        'warn',
        '[ warning ] Burnbag vault services not available — inline image commit disabled (staging URLs will persist)',
      );
    }

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
        return results.map(
          (u: { _id: string | unknown; username: string; email: string }) => ({
            _id: typeof u._id === 'string' ? u._id : String(u._id),
            username: u.username,
            email: u.email,
          }),
        );
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
