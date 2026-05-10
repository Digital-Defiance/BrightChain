import { PlatformID } from '@digitaldefiance/ecies-lib';
import type { FailurePolicyAction } from '../canary-provider/failure-policy';
import type { IProviderConnectionExtended } from '../canary-provider/provider-connection-base';

/**
 * Result of evaluating a failure against the connection's policy.
 */
export interface IFailureEvaluationResult {
  /** Whether the failure count has reached the threshold */
  shouldEscalate: boolean;
  /** The policy action to execute, if escalation is needed */
  action?: FailurePolicyAction;
}

/**
 * Service interface for evaluating consecutive failure counts against
 * thresholds and executing the configured policy action.
 */
export interface IFailurePolicyManager<TID extends PlatformID = string> {
  /** Evaluate a failure and return whether escalation is needed and what action to take */
  evaluateFailure(
    connection: IProviderConnectionExtended<TID>,
    consecutiveFailures: number,
  ): Promise<IFailureEvaluationResult>;

  /** Execute the policy action for a connection */
  executePolicy(
    connection: IProviderConnectionExtended<TID>,
    action: FailurePolicyAction,
  ): Promise<void>;
}
