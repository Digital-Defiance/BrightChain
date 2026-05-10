/**
 * Re-exports from the canonical service interface.
 * The canonical definitions of IApprovalRequest and IApprovalStatus
 * live in interfaces/services/approval-service.ts.
 *
 * IApprovalRequest is re-exported as IApprovalRequestParams to avoid
 * collision with the concrete IApprovalRequest alias in concrete/index.ts.
 */
export type {
  IApprovalRequestInput as IApprovalRequestParams,
  IApprovalStatus,
} from '../services/approval-service';
