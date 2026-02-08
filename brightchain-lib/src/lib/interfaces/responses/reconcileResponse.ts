import { IApiMessageResponse } from '@digitaldefiance/node-express-suite';
import { ReconciliationResult } from '../availability';

/**
 * Reconcile response
 */
export interface IReconcileResponse extends IApiMessageResponse {
  result: ReconciliationResult;
  [key: string]: unknown;
}
