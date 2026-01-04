import { IMnemonicBase } from '@digitaldefiance/suite-core-lib';
import { DefaultBackendIdType } from '../shared-types';
import { IBaseDocument } from './base';

/**
 * Composite interface for user collection documents
 */
export type IMnemonicDocument = IBaseDocument<
  IMnemonicBase<DefaultBackendIdType>,
  DefaultBackendIdType
>;
