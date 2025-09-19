import { ICanaryBase } from '@brightchain/brightchain-lib';
import { DefaultBackendIdType } from '../../shared-types';

/**
 * Represents a signal for when a user activity occurs from a given source
 */
export type ICanaryBackend = ICanaryBase<DefaultBackendIdType, Date>;
