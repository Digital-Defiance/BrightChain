export interface IBreadCrumbContext {
  readonly category: string;
  readonly correlationId?: string; // For tracking related operations
  readonly metadata?: Record<string, unknown>;
}
