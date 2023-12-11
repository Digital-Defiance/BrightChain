/**
 * Response interface for deleting a message
 * DELETE /api/messages/:id
 * @requirements 1.4
 */
export interface IDeleteMessageResponse {
  /** Success indicator */
  success: boolean;
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  [key: string]: any; // Add index signature for ApiResponse compatibility
}
