import { IMnemonicBase } from '@digitaldefiance/suite-core-lib';
import type { DefaultBackendIdType } from '../types/backend-id';
import { IBaseDocument } from './base';

/**
 * Composite interface for user collection documents
 */
export type IMnemonicDocument = IBaseDocument<
  IMnemonicBase<DefaultBackendIdType>,
  DefaultBackendIdType
>;
