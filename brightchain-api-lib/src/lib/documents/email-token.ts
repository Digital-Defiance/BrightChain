import { EmailTokenType, IEmailTokenBase } from '@brightchain/brightchain-lib';
import { DefaultBackendIdType } from '../shared-types';
import { IBaseDocument } from './base';

/**
 * Composite interface for email token collection documents
 */
export type IEmailTokenDocument = IBaseDocument<
  IEmailTokenBase<DefaultBackendIdType, Date, EmailTokenType>,
  DefaultBackendIdType
>;
