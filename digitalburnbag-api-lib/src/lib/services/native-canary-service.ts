/**
 * NativeCanaryService — monitors BrightChain platform activity and emits
 * heartbeat signals without external network dependencies.
 *
 * Native canaries operate entirely within the platform's internal event system,
 * monitoring logins, duress codes, file access, API usage, and vault interactions.
 * Signal propagation uses an internal event bus (callbacks), not HTTP.
 *
 * Feature: canary-provider-expansion
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8
 */
import type {
  INativeCanaryConfigBase,
  INativeCanaryService,
  IConfigureNativeCanaryParams,
  IPlatformEvent,
  NativeCanaryType,
} from '@brightchain/digitalburnbag-lib';
import { HeartbeatSignalType } from '@brightchain/digitalburnbag-lib';
import type { PlatformID } from '@digitaldefiance/ecies-lib';
import type { BrightDBNativeCanaryConfigRepository } from '../collections/native-canary-config-collection';
import type { IEncryptionService } from './credential-service';

// ---------------------------------------------------------------------------
// Signal Callback Interface (internal event bus — no HTTP)
// ---------------------------------------------------------------------------

/**
 * Callback for emitting heartbeat signals to the aggregation engine.
 * This is the internal event bus mechanism — no HTTP calls are made.
 *
 * Requirement: 8.8
 */
export type NativeCanarySignalCallback<TID extends PlatformID = string> = (
  event: {
    userId: TID;
    configId: TID;
    signalType: HeartbeatSignalType;
    canaryType: NativeCanaryType;
    timestamp: Date;
  },
) => void | Promise<void>;

// ---------------------------------------------------------------------------
// Platform Event Store Interface
// ---------------------------------------------------------------------------

/**
 * In-memory store for platform events, keyed by userId.
 * Used to count events within configured periods for threshold evaluation.
 */
export interface IPlatformEventStore<TID extends PlatformID = string> {
  /** Append an event to the store */
  append(event: IPlatformEvent<TID>): void;
  /** Count events for a user of a given type within a time window */
  countEvents(
    userId: TID,
    type: IPlatformEvent<TID>['type'],
    sinceMs: number,
  ): number;
}

// ---------------------------------------------------------------------------
// Default In-Memory Platform Event Store
// ---------------------------------------------------------------------------

/**
 * Simple in-memory event store for platform events.
 * Events are stored per-user and pruned on access to prevent unbounded growth.
 */
export class InMemoryPlatformEventStore<TID extends PlatformID = string>
  implements IPlatformEventStore<TID>
{
  private readonly events = new Map<string, IPlatformEvent<TID>[]>();
  /** Maximum age of events to retain (default: 30 days) */
  private readonly maxRetentionMs: number;

  constructor(maxRetentionMs = 30 * 24 * 60 * 60 * 1000) {
    this.maxRetentionMs = maxRetentionMs;
  }

  append(event: IPlatformEvent<TID>): void {
    const key = String(event.userId);
    const existing = this.events.get(key) ?? [];
    existing.push(event);
    this.events.set(key, existing);
  }

  countEvents(
    userId: TID,
    type: IPlatformEvent<TID>['type'],
    sinceMs: number,
  ): number {
    const key = String(userId);
    const events = this.events.get(key);
    if (!events) return 0;

    const cutoff = Date.now() - sinceMs;
    const retentionCutoff = Date.now() - this.maxRetentionMs;

    // Prune old events beyond retention
    const pruned = events.filter(
      (e) => e.timestamp.getTime() >= retentionCutoff,
    );
    this.events.set(key, pruned);

    // Count events of the specified type within the time window
    return pruned.filter(
      (e) => e.type === type && e.timestamp.getTime() >= cutoff,
    ).length;
  }
}

// ---------------------------------------------------------------------------
// Helper: Map NativeCanaryType to IPlatformEvent type
// ---------------------------------------------------------------------------

/**
 * Maps a NativeCanaryType to the corresponding IPlatformEvent type.
 */
function canaryTypeToEventType(
  canaryType: NativeCanaryType,
): IPlatformEvent['type'] | null {
  switch (canaryType) {
    case 'login_activity':
      return 'login';
    case 'file_access':
      return 'file_access';
    case 'api_usage':
      return 'api_call';
    case 'vault_interaction':
      return 'vault_interaction';
    case 'duress_code':
      return null; // Duress codes don't use event counting
  }
}

/**
 * Gets the threshold and period for a given native canary config and type.
 */
function getThresholdAndPeriod(
  config: INativeCanaryConfigBase<PlatformID>,
): { threshold: number; periodMs: number } | null {
  switch (config.type) {
    case 'login_activity':
      if (config.loginThreshold != null && config.loginPeriodMs != null) {
        return { threshold: config.loginThreshold, periodMs: config.loginPeriodMs };
      }
      return null;
    case 'file_access':
      if (config.fileAccessThreshold != null && config.fileAccessPeriodMs != null) {
        return { threshold: config.fileAccessThreshold, periodMs: config.fileAccessPeriodMs };
      }
      return null;
    case 'api_usage':
      if (config.apiUsageThreshold != null && config.apiUsagePeriodMs != null) {
        return { threshold: config.apiUsageThreshold, periodMs: config.apiUsagePeriodMs };
      }
      return null;
    case 'vault_interaction':
      if (config.vaultInteractionThreshold != null && config.vaultInteractionPeriodMs != null) {
        return { threshold: config.vaultInteractionThreshold, periodMs: config.vaultInteractionPeriodMs };
      }
      return null;
    case 'duress_code':
      return null; // Duress codes don't use threshold/period
  }
}

// ---------------------------------------------------------------------------
// NativeCanaryService Implementation
// ---------------------------------------------------------------------------

/**
 * Concrete implementation of INativeCanaryService.
 *
 * - Monitors platform activity (logins, file access, API usage, vault interactions)
 * - Emits PRESENCE when event count ≥ threshold within period
 * - Emits ABSENCE when event count < threshold within period
 * - Immediately emits DURESS on duress code authentication (Req 8.3)
 * - Encrypts duress codes at rest via IEncryptionService (Req 8.7)
 * - Uses internal event bus (callbacks) for signal propagation — no HTTP (Req 8.8)
 *
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8
 */
export class NativeCanaryService<TID extends PlatformID = string>
  implements INativeCanaryService<TID>
{
  constructor(
    private readonly repository: BrightDBNativeCanaryConfigRepository<TID>,
    private readonly encryptionService: IEncryptionService,
    private readonly eventStore: IPlatformEventStore<TID>,
    private readonly onSignal?: NativeCanarySignalCallback<TID>,
    private readonly generateId?: () => TID,
  ) {}

  // -----------------------------------------------------------------------
  // configure — create native canary config with type-specific thresholds
  // Requirement: 8.1, 8.4, 8.5, 8.6
  // -----------------------------------------------------------------------

  async configure(
    params: IConfigureNativeCanaryParams<TID>,
  ): Promise<INativeCanaryConfigBase<TID>> {
    const now = new Date();
    const id = this.generateId
      ? this.generateId()
      : (`nc-${String(params.userId)}-${params.type}-${now.getTime()}` as unknown as TID);

    const config: INativeCanaryConfigBase<TID> = {
      id,
      userId: params.userId,
      type: params.type,
      isEnabled: params.isEnabled,
      loginThreshold: params.loginThreshold,
      loginPeriodMs: params.loginPeriodMs,
      fileAccessThreshold: params.fileAccessThreshold,
      fileAccessPeriodMs: params.fileAccessPeriodMs,
      apiUsageThreshold: params.apiUsageThreshold,
      apiUsagePeriodMs: params.apiUsagePeriodMs,
      vaultInteractionThreshold: params.vaultInteractionThreshold,
      vaultInteractionPeriodMs: params.vaultInteractionPeriodMs,
      createdAt: now,
      updatedAt: now,
    };

    await this.repository.createConfig(config);
    return config;
  }

  // -----------------------------------------------------------------------
  // updateConfig — update native canary configuration
  // -----------------------------------------------------------------------

  async updateConfig(
    configId: TID,
    updates: Partial<INativeCanaryConfigBase<TID>>,
  ): Promise<INativeCanaryConfigBase<TID>> {
    await this.repository.updateConfig(configId, updates);
    const updated = await this.repository.getConfigById(configId);
    if (!updated) {
      throw new Error(
        `Native canary config not found after update: ${String(configId)}`,
      );
    }
    return updated;
  }

  // -----------------------------------------------------------------------
  // getConfigs — get all native canary configs for a user
  // -----------------------------------------------------------------------

  async getConfigs(userId: TID): Promise<INativeCanaryConfigBase<TID>[]> {
    return this.repository.getConfigsByUser(userId);
  }

  // -----------------------------------------------------------------------
  // onPlatformEvent — count events within configured period, emit signal
  // Requirement: 8.1, 8.4, 8.5, 8.6, 8.8
  // -----------------------------------------------------------------------

  async onPlatformEvent(event: IPlatformEvent<TID>): Promise<void> {
    // Store the event
    this.eventStore.append(event);

    // Find all enabled configs for this user that match the event type
    const configs = await this.repository.getConfigsByUser(event.userId);
    const matchingConfigs = configs.filter((config) => {
      if (!config.isEnabled) return false;
      const expectedEventType = canaryTypeToEventType(config.type);
      return expectedEventType === event.type;
    });

    // Evaluate each matching config and emit signals
    for (const config of matchingConfigs) {
      const thresholdInfo = getThresholdAndPeriod(config);
      if (!thresholdInfo) continue;

      const eventType = canaryTypeToEventType(config.type);
      if (!eventType) continue;

      const count = this.eventStore.countEvents(
        event.userId,
        eventType,
        thresholdInfo.periodMs,
      );

      const signalType =
        count >= thresholdInfo.threshold
          ? HeartbeatSignalType.PRESENCE
          : HeartbeatSignalType.ABSENCE;

      // Emit signal via internal event bus (no HTTP) — Req 8.8
      if (this.onSignal) {
        await this.onSignal({
          userId: event.userId,
          configId: config.id,
          signalType,
          canaryType: config.type,
          timestamp: new Date(),
        });
      }
    }
  }

  // -----------------------------------------------------------------------
  // onDuressCodeLogin — immediately emit DURESS signal (Req 8.3)
  // No waiting for scheduled check — immediate propagation
  // -----------------------------------------------------------------------

  async onDuressCodeLogin(userId: TID, duressCode: string): Promise<void> {
    // Verify the code is actually a duress code
    const isDuress = await this.isDuressCode(userId, duressCode);
    if (!isDuress) return;

    // Find the duress_code config for this user
    const configs = await this.repository.getConfigsByUser(userId);
    const duressConfig = configs.find(
      (c) => c.type === 'duress_code' && c.isEnabled,
    );

    // Immediately emit DURESS signal without waiting for scheduled check (Req 8.3)
    if (this.onSignal) {
      await this.onSignal({
        userId,
        configId: duressConfig?.id ?? ('' as unknown as TID),
        signalType: HeartbeatSignalType.DURESS,
        canaryType: 'duress_code',
        timestamp: new Date(),
      });
    }
  }

  // -----------------------------------------------------------------------
  // evaluateStatus — check event counts against thresholds
  // Requirement: 8.1, 8.4, 8.5, 8.6
  // -----------------------------------------------------------------------

  async evaluateStatus(configId: TID): Promise<HeartbeatSignalType> {
    const config = await this.repository.getConfigById(configId);
    if (!config) {
      return HeartbeatSignalType.CHECK_FAILED;
    }

    if (!config.isEnabled) {
      return HeartbeatSignalType.INCONCLUSIVE;
    }

    // Duress code canaries don't use threshold evaluation
    if (config.type === 'duress_code') {
      // Duress code canaries are always "present" unless triggered
      return HeartbeatSignalType.PRESENCE;
    }

    const thresholdInfo = getThresholdAndPeriod(config);
    if (!thresholdInfo) {
      return HeartbeatSignalType.CHECK_FAILED;
    }

    const eventType = canaryTypeToEventType(config.type);
    if (!eventType) {
      return HeartbeatSignalType.CHECK_FAILED;
    }

    const count = this.eventStore.countEvents(
      config.userId,
      eventType,
      thresholdInfo.periodMs,
    );

    // PRESENCE if count ≥ threshold, ABSENCE if below
    return count >= thresholdInfo.threshold
      ? HeartbeatSignalType.PRESENCE
      : HeartbeatSignalType.ABSENCE;
  }

  // -----------------------------------------------------------------------
  // setDuressCodes — encrypt codes at rest via EncryptionService (Req 8.7)
  // -----------------------------------------------------------------------

  async setDuressCodes(userId: TID, codes: string[]): Promise<void> {
    // Encrypt each duress code individually
    const encryptedCodes: string[] = [];
    for (const code of codes) {
      const result = await this.encryptionService.encrypt(code);
      // Store as JSON string containing ciphertext, iv, and authTag
      encryptedCodes.push(
        JSON.stringify({
          ciphertext: result.ciphertext,
          iv: result.iv,
          authTag: result.authTag,
        }),
      );
    }

    // Find or create the duress_code config for this user
    const configs = await this.repository.getConfigsByUser(userId);
    const duressConfig = configs.find((c) => c.type === 'duress_code');

    if (duressConfig) {
      await this.repository.updateConfig(duressConfig.id, {
        encryptedDuressCodes: encryptedCodes,
      } as Partial<INativeCanaryConfigBase<TID>>);
    } else {
      // Create a new duress_code config with the encrypted codes
      const now = new Date();
      const id = this.generateId
        ? this.generateId()
        : (`nc-${String(userId)}-duress_code-${now.getTime()}` as unknown as TID);

      const config: INativeCanaryConfigBase<TID> = {
        id,
        userId,
        type: 'duress_code',
        isEnabled: true,
        encryptedDuressCodes: encryptedCodes,
        createdAt: now,
        updatedAt: now,
      };
      await this.repository.createConfig(config);
    }
  }

  // -----------------------------------------------------------------------
  // isDuressCode — decrypt and compare during authentication (Req 8.7)
  // -----------------------------------------------------------------------

  async isDuressCode(userId: TID, code: string): Promise<boolean> {
    const configs = await this.repository.getConfigsByUser(userId);
    const duressConfig = configs.find((c) => c.type === 'duress_code');

    if (!duressConfig?.encryptedDuressCodes?.length) {
      return false;
    }

    // Decrypt each stored code and compare
    for (const encryptedEntry of duressConfig.encryptedDuressCodes) {
      try {
        const { ciphertext, iv, authTag } = JSON.parse(encryptedEntry) as {
          ciphertext: string;
          iv: string;
          authTag: string;
        };
        const decrypted = await this.encryptionService.decrypt(
          ciphertext,
          iv,
          authTag,
        );
        if (decrypted === code) {
          return true;
        }
      } catch {
        // If decryption fails for one code, continue checking others
        continue;
      }
    }

    return false;
  }
}
