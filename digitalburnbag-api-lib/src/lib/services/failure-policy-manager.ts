import type {
  FailurePolicyAction,
  IFailureEvaluationResult,
  IFailurePolicyManager,
  IProviderConnectionExtended,
} from '@brightchain/digitalburnbag-lib';
import type { PlatformID } from '@digitaldefiance/ecies-lib';

/**
 * Valid failure policy action values.
 */
export const VALID_FAILURE_POLICY_ACTIONS: readonly FailurePolicyAction[] = [
  'pause_and_notify',
  'notify_only',
  'trigger_protocol',
  'ignore',
] as const;

/**
 * Default failure threshold when none is configured.
 */
export const DEFAULT_FAILURE_THRESHOLD = 5;

/**
 * Type guard that checks whether a string is a valid FailurePolicyAction.
 */
export function isValidFailurePolicyAction(
  value: string,
): value is FailurePolicyAction {
  return (VALID_FAILURE_POLICY_ACTIONS as readonly string[]).includes(value);
}

/**
 * Callback signature for notifications emitted by the policy manager.
 */
export type PolicyNotificationCallback = (
  connectionId: string,
  message: string,
  details?: Record<string, unknown>,
) => void | Promise<void>;

/**
 * Resets a connection's failure-related state after a successful check.
 * Returns a partial update object suitable for persisting.
 */
export function resetOnSuccess<TID extends PlatformID = string>(
  connection: IProviderConnectionExtended<TID>,
): Pick<
  IProviderConnectionExtended<TID>,
  'consecutiveFailures' | 'status' | 'isPaused'
> {
  return {
    consecutiveFailures: 0,
    status: 'connected',
    isPaused:
      connection.isPaused &&
      connection.pauseReason?.startsWith('Failure policy:')
        ? false
        : connection.isPaused,
  };
}

/**
 * Concrete implementation of IFailurePolicyManager.
 *
 * Evaluates consecutive failure counts against the connection's configured
 * threshold and executes the appropriate policy action.
 */
export class FailurePolicyManager<TID extends PlatformID = string>
  implements IFailurePolicyManager<TID>
{
  private readonly notify: PolicyNotificationCallback;

  constructor(notify?: PolicyNotificationCallback) {
    this.notify =
      notify ?? ((id, msg) => console.log(`[FailurePolicy] ${id}: ${msg}`));
  }

  async evaluateFailure(
    connection: IProviderConnectionExtended<TID>,
    consecutiveFailures: number,
  ): Promise<IFailureEvaluationResult> {
    const threshold =
      connection.failurePolicyConfig?.failureThreshold ??
      DEFAULT_FAILURE_THRESHOLD;

    if (consecutiveFailures >= threshold) {
      return {
        shouldEscalate: true,
        action:
          connection.failurePolicyConfig?.failurePolicy ?? 'pause_and_notify',
      };
    }

    return { shouldEscalate: false };
  }

  async executePolicy(
    connection: IProviderConnectionExtended<TID>,
    action: FailurePolicyAction,
  ): Promise<void> {
    const connId = String(connection.id);

    switch (action) {
      case 'pause_and_notify': {
        connection.isPaused = true;
        connection.pauseReason = `Failure policy: consecutive failures reached threshold (${connection.failurePolicyConfig?.failureThreshold ?? DEFAULT_FAILURE_THRESHOLD})`;
        await this.notify(
          connId,
          `Provider paused: ${connection.pauseReason}`,
          { action, providerId: String(connection.providerId) },
        );
        break;
      }

      case 'notify_only': {
        await this.notify(
          connId,
          `Failure threshold reached for provider ${String(connection.providerId)} — continuing checks`,
          { action, consecutiveFailures: connection.consecutiveFailures },
        );
        break;
      }

      case 'trigger_protocol': {
        // Treat persistent failure as ABSENCE and evaluate bindings.
        // Full binding evaluation will be wired when the canary evaluation
        // service is integrated; for now we log and notify.
        await this.notify(
          connId,
          `Treating persistent failure as ABSENCE for provider ${String(connection.providerId)} — evaluating bindings`,
          {
            action,
            treatAs: 'absence',
            providerId: String(connection.providerId),
          },
        );
        break;
      }

      case 'ignore': {
        // Log only — no user-facing action.
        console.log(
          `[FailurePolicy] ignore: connection ${connId} reached threshold, no action taken`,
        );
        break;
      }

      default: {
        // Exhaustive check — should never happen with valid FailurePolicyAction values.
        const _exhaustive: never = action;
        throw new Error(`Unknown failure policy action: ${_exhaustive}`);
      }
    }
  }
}
