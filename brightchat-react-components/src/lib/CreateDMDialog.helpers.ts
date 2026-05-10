/**
 * Pure helper functions for CreateDMDialog logic.
 *
 * Exported for property-based testing.
 */

/**
 * Filters a list of users by display name using case-insensitive substring match.
 *
 * Requirement 6.2: Searchable user list filtered by typed query.
 */
export function filterUsersByQuery<T extends { displayName: string }>(
  users: T[],
  query: string,
): T[] {
  if (!query) return users;
  const lowerQuery = query.toLowerCase();
  return users.filter((u) => u.displayName.toLowerCase().includes(lowerQuery));
}

/**
 * Finds an existing conversation with the given recipient in the conversation list.
 * Returns the conversation ID if found, or null if no existing conversation exists.
 *
 * Requirement 6.4: Navigate to existing conversation instead of creating duplicate.
 */
export function findExistingConversation<
  T extends { id: string; participantIds: string[] },
>(
  conversations: T[],
  currentUserId: string,
  recipientId: string,
): string | null {
  const match = conversations.find(
    (conv) =>
      conv.participantIds.includes(currentUserId) &&
      conv.participantIds.includes(recipientId) &&
      conv.participantIds.length === 2,
  );
  return match?.id ?? null;
}
