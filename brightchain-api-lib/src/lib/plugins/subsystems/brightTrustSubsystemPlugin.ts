import {
  AliasRegistry,
  AuditLogService,
  BrightTrustStateMachine,
  IdentitySealingPipeline,
  IdentityValidator,
  MembershipProofService,
  ServiceProvider,
  type IAppSubsystemPlugin,
  type ISubsystemContext,
} from '@brightchain/brightchain-lib';
import {
  BrightTrustDBName,
  BrightTrustPoolID,
} from '@brightchain/brightchain-lib/lib/db';
import { BrightDb } from '@brightchain/db';
import { debugLog } from '@digitaldefiance/node-express-suite';
import type { PlatformID } from '@digitaldefiance/node-ecies-lib';
import { BrightTrustGossipHandler } from '../../availability/brightTrustGossipHandler';
import { GossipService } from '../../availability/gossipService';
import {
  BrightTrustDatabaseAdapter,
  CLIOperatorPrompt,
  ContentIngestionService,
  IdentityExpirationScheduler,
} from '../../services';

/**
 * BrightTrust subsystem plugin.
 *
 * Extracts the BrightTrust subsystem initialization block from App.start()
 * into a self-contained plugin. Creates BrightTrustDatabaseAdapter,
 * BrightTrustStateMachine, AuditLogService, IdentitySealingPipeline,
 * AliasRegistry, IdentityExpirationScheduler, BrightTrustGossipHandler
 * factory, IdentityValidator, ContentIngestionService, and CLIOperatorPrompt.
 *
 * This is the only subsystem plugin that implements stop() — it stops the
 * IdentityExpirationScheduler and BrightTrustGossipHandler on teardown.
 *
 * @see Requirements 10.1, 10.2, 10.3, 10.4, 10.5, 10.6
 */
export class BrightTrustSubsystemPlugin implements IAppSubsystemPlugin {
  public readonly name = 'brighttrust';
  public readonly isOptional = true;

  private brightTrustDbAdapter: BrightTrustDatabaseAdapter<PlatformID> | null = null;
  private brightTrustStateMachine: BrightTrustStateMachine<PlatformID> | null = null;
  private identityExpirationScheduler: IdentityExpirationScheduler<PlatformID> | null = null;
  private brightTrustGossipHandler: BrightTrustGossipHandler<PlatformID> | null = null;

  public async initialize(context: ISubsystemContext): Promise<void> {
    const blockStore = context.blockStore;

    // Task 23.1: Initialize BrightTrustDatabaseAdapter with pool ID "BrightTrust-system"
    const brightTrustDb = new BrightDb(blockStore, {
      name: BrightTrustDBName,
      poolId: BrightTrustPoolID,
    });
    this.brightTrustDbAdapter = new BrightTrustDatabaseAdapter<PlatformID>(
      brightTrustDb,
      ServiceProvider.getInstance<PlatformID>().idProvider,
    );
    context.services.register(
      'brightTrustDbAdapter',
      () => this.brightTrustDbAdapter,
    );
    debugLog(
      context.environment.debug,
      'log',
      '[ ready ] BrightTrust database adapter initialized (pool: BrightTrust-system)',
    );

    // Task 23.2: Initialize BrightTrustStateMachine with dependencies
    const serviceProvider = ServiceProvider.getInstance<PlatformID>();
    const sealingService = serviceProvider.sealingService;
    const eciesService = serviceProvider.eciesService;

    // AuditLogService needs a signing member — use the system member from
    // the plugin if available, otherwise defer audit log creation.
    // For now, create without block store persistence (audit entries go to DB only).
    const auditLogService = new AuditLogService<PlatformID>(
      this.brightTrustDbAdapter,
      // The signing member is set when the node operator is configured.
      // At startup we pass null — appendEntry will skip signature generation.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      null as any,
      // ECIESService<TID> is runtime-compatible with ECIESService; cast needed
      // because AuditLogService imports the base ECIESService type.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      eciesService as any,
    );
    context.services.register('auditLogService', () => auditLogService);

    // Create IdentitySealingPipeline for content ingestion
    const identitySealingPipeline = new IdentitySealingPipeline<PlatformID>(
      this.brightTrustDbAdapter,
      sealingService,
      eciesService,
      () => this.brightTrustStateMachine!.getCurrentEpoch(),
      () => this.brightTrustDbAdapter!.getStatuteConfig(),
    );
    context.services.register(
      'identitySealingPipeline',
      () => identitySealingPipeline,
    );

    // Create AliasRegistry
    const aliasRegistry = new AliasRegistry<PlatformID>(
      this.brightTrustDbAdapter,
      identitySealingPipeline,
      eciesService,
      () => this.brightTrustStateMachine!.getCurrentEpoch(),
    );
    context.services.register('aliasRegistry', () => aliasRegistry);

    // Create the BrightTrustStateMachine — central coordinator
    // GossipService is wired externally via setPoolDiscoveryService.
    // We pass a no-op stub until the real gossip service is available.
    // The BrightTrustGossipHandler bridges gossip ↔ state machine.
    const gossipStub = {
      announceBrightTrustProposal: async () => {},
      announceBrightTrustVote: async () => {},
      onBrightTrustProposal: () => {},
      offBrightTrustProposal: () => {},
      onBrightTrustVote: () => {},
      offBrightTrustVote: () => {},
    };
    this.brightTrustStateMachine = new BrightTrustStateMachine<PlatformID>(
      this.brightTrustDbAdapter,
      sealingService,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      gossipStub as any,
      auditLogService,
      aliasRegistry,
    );
    context.services.register(
      'brightTrustStateMachine',
      () => this.brightTrustStateMachine,
    );
    debugLog(
      context.environment.debug,
      'log',
      '[ ready ] BrightTrust state machine initialized',
    );

    // Task 23.3: Start IdentityExpirationScheduler
    this.identityExpirationScheduler = new IdentityExpirationScheduler<PlatformID>(
      this.brightTrustDbAdapter,
      auditLogService,
    );
    this.identityExpirationScheduler.start();
    context.services.register(
      'identityExpirationScheduler',
      () => this.identityExpirationScheduler,
    );
    debugLog(
      context.environment.debug,
      'log',
      '[ ready ] Identity expiration scheduler started',
    );

    // Task 23.4: Register gossip message handlers for BrightTrust_proposal and brightTrust_vote
    // The BrightTrustGossipHandler is created here but gossip service binding
    // happens when setBrightTrustGossipService() is called externally.
    // For now, store the state machine reference so it can be wired later.
    context.services.register(
      'brightTrustGossipHandlerFactory',
      () => (gossipService: GossipService) => {
        this.brightTrustGossipHandler = new BrightTrustGossipHandler<PlatformID>(
          gossipService,
          this.brightTrustStateMachine!,
          this.brightTrustDbAdapter!,
        );
        this.brightTrustGossipHandler.start();
        context.services.register(
          'brightTrustGossipHandler',
          () => this.brightTrustGossipHandler,
          true, // overwrite allowed — factory may be called after initial registration
        );
        debugLog(
          context.environment.debug,
          'log',
          '[ ready ] BrightTrust gossip handlers registered (brightTrust_proposal, brightTrust_vote)',
        );
      },
    );

    // Task 23.5: Wire content ingestion middleware (IdentityValidator + IdentitySealingPipeline)
    const membershipProofService = new MembershipProofService<PlatformID>();
    const identityValidator = new IdentityValidator<PlatformID>(
      this.brightTrustDbAdapter,
      eciesService,
      membershipProofService,
    );
    context.services.register('identityValidator', () => identityValidator);

    const contentIngestionService = new ContentIngestionService<PlatformID>(
      identityValidator,
      identitySealingPipeline,
    );
    context.services.register(
      'contentIngestionService',
      () => contentIngestionService,
    );

    // CLIOperatorPrompt for interactive voting
    const operatorPrompt = new CLIOperatorPrompt();
    context.services.register('operatorPrompt', () => operatorPrompt);

    debugLog(
      context.environment.debug,
      'log',
      '[ ready ] BrightTrust subsystem fully initialized',
    );
  }

  public async stop(): Promise<void> {
    // Task 23.3: Stop ExpirationScheduler (graceful cleanup)
    if (this.identityExpirationScheduler) {
      this.identityExpirationScheduler.stop();
      this.identityExpirationScheduler = null;
    }

    // Task 23.4: Unregister gossip handlers
    if (this.brightTrustGossipHandler) {
      this.brightTrustGossipHandler.stop();
      this.brightTrustGossipHandler = null;
    }

    // Clean up BrightTrust references
    this.brightTrustStateMachine = null;
    this.brightTrustDbAdapter = null;
  }
}
