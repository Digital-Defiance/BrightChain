import { PhoneNumber, PlatformID } from '@digitaldefiance/ecies-lib';
import {
  IHasId,
  IHasTimestampOwners,
  IHasTimestamps,
} from '@digitaldefiance/suite-core-lib';
import { CanaryCondition } from '../../enumerations/canary-condition';
import { SourceType } from '../../enumerations/source-type';
import { AccessBy, ThresholdUnit } from '../../shared-types';

export interface ICanaryProtocolBase<
  I extends PlatformID,
  D extends Date | string,
  P extends PhoneNumber | string,
  A extends AccessBy | string,
  S extends SourceType | string,
  C extends CanaryCondition | string,
  T extends ThresholdUnit | string,
> extends IHasId<I>,
    IHasTimestamps<D>,
    IHasTimestampOwners<I> {
  /**
   * The ID of the canary associated with this protocol.
   */
  canaryId: I;
  /**
   * The name of the protocol
   */
  name?: string;
  /**
   * The description of the protocol
   */
  description?: string;
  /**
   * The files associated with the canary protocol.
   */
  files?: Array<I>;
  /**
   * The folders associated with the canary protocol.
   */
  folders?: Array<I>;
  /**
   * Recursively include all files and folders within the specified folders
   */
  recursive: boolean;
  /**
   * The emails to notify when the protocol is enacted
   */
  recipientEmails: Array<string>;
  /**
   * The phone numbers to notify via SMS when the protocol is enacted
   */
  recipientSMS: Array<P>;
  /**
   * The webhook URL to notify when the protocol is enacted
   */
  webhookUrl?: string;
  /**
   * Whether to delete files when the protocol is enacted.
   */
  onActivateDeleteFiles: boolean;
  /**
   * Whether to delete the user's account when the protocol is enacted.
   */
  onActivateDeleteAccount: boolean;
  /**
   * Whether to deactivate the user's account when the protocol is enacted.
   */
  onActivateDeactivateAccount: boolean;
  /**
   * User scope to release files to when the protocol is enacted.
   */
  onActivateReleaseTo: A;
  /**
   * The password hash to release files to when the protocol is enacted and the releaseTo is 'password'.
   */
  onActivateReleasePasswordHash?: string;
  /**
   * Whether to deactivate this protocol when enacted.
   */
  onActivateDeactivateProtocol: boolean;
  /**
   * When enacted, enable these other protocols
   */
  onActivateEnableProtocolIds: Array<I>;

  /**
   * The activity source type that triggers this protocol.
   */
  activityType: S;
  triggerCondition: C; // e.g., PRESENCE for duress login, ABSENCE for no steps
  minThresholdValue?: number; // e.g., 7 for days, or 100 for steps (min required)
  maxThresholdValue?: number; // e.g., 30 for days, or 1000 for steps (max allowed)
  thresholdUnit?: T; // Unit for threshold (time or number of events)
  lastChirpAt?: D; // Timestamp of the last time the source for this activity was detected
  lastCheckedAt: D; // Timestamp of the last time this activity source was queried
  isEnabled: boolean; // Whether this specific condition is active within the canary
  deactivateAfterEnacting: boolean; // Whether to deactivate this protocol after it is enacted

  activatePasswordHashes?: Array<string>; // Passwords that can activate this protocol
  duressPasswordHashes?: Array<string>; // Passwords that initiate a duress signal
  /**
   * Whether to activate secondary protocols when this protocol is enacted.
   */
  enableSecondaryProtocols?: Array<I>;
}
