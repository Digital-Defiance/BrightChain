/**
 * Actions that can be taken when a provider's consecutive CHECK_FAILED
 * count reaches the configured failure threshold.
 *
 * - 'pause_and_notify': Pause checks and send notification to the user
 * - 'notify_only': Continue checks and send notification
 * - 'trigger_protocol': Treat persistent failure as absence and trigger bound protocols
 * - 'ignore': Log only, take no action
 */
export type FailurePolicyAction =
  | 'pause_and_notify'
  | 'notify_only'
  | 'trigger_protocol'
  | 'ignore';

/**
 * Configuration for how the system responds when a provider's consecutive
 * CHECK_FAILED count reaches the threshold.
 */
export interface IFailurePolicyConfig {
  /**
   * Number of consecutive CHECK_FAILED results required before escalation.
   * @default 5
   */
  failureThreshold: number;

  /** Action to take when the failure threshold is reached. */
  failurePolicy: FailurePolicyAction;
}
