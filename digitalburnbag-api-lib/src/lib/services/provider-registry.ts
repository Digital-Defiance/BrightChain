/**
 * CanaryProviderRegistry — concrete implementation of ICanaryProviderRegistry.
 *
 * Manages registration, lookup, and lifecycle of all provider adapters
 * (built-in and custom). Supports export/import of provider configs to/from JSON.
 *
 * Feature: canary-provider-system
 * Requirements: 8.1, 8.2, 8.4, 8.5
 */
import type {
  HeartbeatStatusChangeListener,
  IAggregatedHeartbeatStatus,
  IAggregationConfig,
  ICanaryProviderAdapter,
  ICanaryProviderConfig,
  ICanaryProviderRegistry,
  IHeartbeatCheckResult,
  IHeartbeatEvent,
  IProviderConfigValidator,
  IProviderCredentials,
  IScheduledCheck,
} from '@brightchain/digitalburnbag-lib';
import {
  HeartbeatSignalType,
  ProviderCategory,
} from '@brightchain/digitalburnbag-lib';
import type { PlatformID } from '@digitaldefiance/ecies-lib';

// ---------------------------------------------------------------------------
// Minimal ConfigDrivenProviderAdapter for wrapping ICanaryProviderConfig
// ---------------------------------------------------------------------------

/**
 * A lightweight adapter that wraps an ICanaryProviderConfig.
 * The real ConfigDrivenProviderAdapter lives in the lib; this is a
 * registry-internal wrapper so we can store configs as adapters.
 */
class ConfigBackedAdapter<TID extends PlatformID = string>
  implements ICanaryProviderAdapter<TID>
{
  constructor(private readonly config: ICanaryProviderConfig<TID>) {}

  getConfig(): ICanaryProviderConfig<TID> {
    return this.config;
  }

  async checkHeartbeat(
    _credentials: IProviderCredentials<TID>,
    _since: Date,
    _until?: Date,
  ): Promise<IHeartbeatCheckResult<TID>> {
    // Placeholder — real implementation delegates to HTTP client
    return {
      success: false,
      error: 'ConfigBackedAdapter.checkHeartbeat not implemented',
      checkedAt: new Date(),
      events: [],
      eventCount: 0,
      signalType: HeartbeatSignalType.CHECK_FAILED,
      confidence: 0,
      timeSinceLastActivityMs: null,
      duressDetected: false,
    };
  }

  async validateCredentials(
    _credentials: IProviderCredentials<TID>,
  ): Promise<{ valid: boolean; error?: string }> {
    return { valid: true };
  }

  supportsDuressDetection(): boolean {
    return false;
  }

  getSupportedDuressTypes(): string[] {
    return [];
  }

  getRecommendedCheckIntervalMs(): number {
    return this.config.minCheckIntervalMs;
  }
}

// ---------------------------------------------------------------------------
// CanaryProviderRegistry
// ---------------------------------------------------------------------------

/**
 * Concrete implementation of ICanaryProviderRegistry.
 *
 * - Loads BUILTIN_PROVIDER_CONFIGS on initialization (Req 8.1)
 * - Supports custom provider registration with validation (Req 8.2)
 * - Supports export/import of provider configs (Req 8.4, 8.5)
 */
export class CanaryProviderRegistry<TID extends PlatformID = string>
  implements ICanaryProviderRegistry<TID>
{
  private readonly adapters = new Map<string, ICanaryProviderAdapter<TID>>();
  private readonly configs = new Map<string, ICanaryProviderConfig<TID>>();
  private readonly statusChangeListeners: HeartbeatStatusChangeListener<TID>[] =
    [];

  constructor(
    builtinConfigs: ICanaryProviderConfig<TID>[],
    private readonly validator?: IProviderConfigValidator<TID>,
  ) {
    // Load built-in configs on initialization (Req 8.1)
    for (const config of builtinConfigs) {
      const adapter = new ConfigBackedAdapter<TID>(config);
      const key = String(config.id);
      this.adapters.set(key, adapter);
      this.configs.set(key, config);
    }
  }

  // -----------------------------------------------------------------------
  // ICanaryProviderRegistry — adapter management
  // -----------------------------------------------------------------------

  registerProvider(adapter: ICanaryProviderAdapter<TID>): void {
    const config = adapter.getConfig();
    const key = String(config.id);
    this.adapters.set(key, adapter);
    this.configs.set(key, config);
  }

  unregisterProvider(providerId: TID): void {
    const key = String(providerId);
    this.adapters.delete(key);
    this.configs.delete(key);
  }

  getProvider(providerId: TID): ICanaryProviderAdapter<TID> | undefined {
    return this.adapters.get(String(providerId));
  }

  getAllProviders(): ICanaryProviderAdapter<TID>[] {
    return Array.from(this.adapters.values());
  }

  getProvidersByCategory(
    category: ProviderCategory,
  ): ICanaryProviderAdapter<TID>[] {
    return this.getAllProviders().filter(
      (a) => a.getConfig().category === category,
    );
  }

  getProviderConfigs(): ICanaryProviderConfig<TID>[] {
    return Array.from(this.configs.values());
  }

  // -----------------------------------------------------------------------
  // ICanaryProviderRegistry — heartbeat operations (delegated)
  // -----------------------------------------------------------------------

  async checkHeartbeat(
    _userId: TID,
    providerId: TID,
    credentials: IProviderCredentials<TID>,
    since: Date,
    until?: Date,
  ): Promise<IHeartbeatCheckResult<TID>> {
    const adapter = this.getProvider(providerId);
    if (!adapter) {
      throw new Error(`Provider ${String(providerId)} not found`);
    }
    return adapter.checkHeartbeat(credentials, since, until);
  }

  async checkAllHeartbeats(
    _userId: TID,
    _credentialsMap: Map<TID, IProviderCredentials<TID>>,
    _since: Date,
    _config?: Partial<IAggregationConfig>,
  ): Promise<IAggregatedHeartbeatStatus<TID>> {
    throw new Error(
      'checkAllHeartbeats not implemented — use AggregationEngine',
    );
  }

  scheduleChecks(
    _userId: TID,
    _providerId: TID,
    _credentials: IProviderCredentials<TID>,
    _intervalMs: number,
  ): void {
    // Scheduling is handled by HealthMonitorService
  }

  cancelScheduledChecks(_userId: TID, _providerId?: TID): void {
    // Scheduling is handled by HealthMonitorService
  }

  getScheduledCheck(
    _userId: TID,
    _providerId: TID,
  ): IScheduledCheck<TID> | undefined {
    return undefined;
  }

  getScheduledChecksForUser(_userId: TID): IScheduledCheck<TID>[] {
    return [];
  }

  onStatusChange(listener: HeartbeatStatusChangeListener<TID>): () => void {
    this.statusChangeListeners.push(listener);
    return () => {
      const idx = this.statusChangeListeners.indexOf(listener);
      if (idx >= 0) this.statusChangeListeners.splice(idx, 1);
    };
  }

  async handleWebhook(
    providerId: TID,
    payload: unknown,
    headers: Record<string, string>,
  ): Promise<IHeartbeatEvent<TID> | null> {
    const adapter = this.getProvider(providerId);
    if (!adapter?.handleWebhook) return null;
    return adapter.handleWebhook(payload, headers);
  }

  // -----------------------------------------------------------------------
  // Custom provider registration (Req 8.2)
  // -----------------------------------------------------------------------

  registerCustomProvider(config: ICanaryProviderConfig<TID>): void {
    if (this.validator) {
      const result = this.validator.validate(config);
      if (!result.valid) {
        throw new Error(`Invalid provider config: ${result.errors.join('; ')}`);
      }
    }
    const adapter = new ConfigBackedAdapter<TID>(config);
    const key = String(config.id);
    this.adapters.set(key, adapter);
    this.configs.set(key, config);
  }

  // -----------------------------------------------------------------------
  // Export / Import (Req 8.4, 8.5)
  // -----------------------------------------------------------------------

  exportProviderConfig(
    providerId: TID,
  ): ICanaryProviderConfig<TID> | undefined {
    return this.configs.get(String(providerId));
  }

  importProviderConfig(config: ICanaryProviderConfig<TID>): void {
    if (this.validator) {
      const result = this.validator.validate(config);
      if (!result.valid) {
        throw new Error(
          `Invalid provider config for import: ${result.errors.join('; ')}`,
        );
      }
    }
    const adapter = new ConfigBackedAdapter<TID>(config);
    const key = String(config.id);
    this.adapters.set(key, adapter);
    this.configs.set(key, config);
  }
}
