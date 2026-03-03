/**
 * Bulk action utilities for BrightMail inbox operations.
 *
 * Extracted for testability — these pure-logic helpers are used by InboxView
 * and can be property-tested independently of React rendering.
 */

/**
 * Performs bulk deletion by invoking deleteEmailFn once per ID.
 * Returns which IDs succeeded and which failed.
 *
 * @param ids - Array of message IDs to delete
 * @param deleteEmailFn - Async function that deletes a single email by ID
 * @returns Object with succeeded and failed ID arrays
 */
export async function bulkDelete(
  ids: string[],
  deleteEmailFn: (id: string) => Promise<unknown>,
): Promise<{ succeeded: string[]; failed: string[] }> {
  const succeeded: string[] = [];
  const failed: string[] = [];

  for (const id of ids) {
    try {
      await deleteEmailFn(id);
      succeeded.push(id);
    } catch {
      failed.push(id);
    }
  }

  return { succeeded, failed };
}

/**
 * Builds an error message for a failed delete operation using the i18n template.
 * The template should contain `{MESSAGE_ID}` which gets replaced with the actual ID.
 *
 * @param template - i18n template string containing {MESSAGE_ID}
 * @param messageId - The ID of the email that failed to delete
 * @returns The error message with the messageId substituted
 */
export function buildDeleteErrorMessage(
  template: string,
  messageId: string,
): string {
  return template.replace('{MESSAGE_ID}', messageId);
}
