/**
 * Wires ConversationService.promoteToGroup to GroupService.createGroupFromConversation.
 *
 * This module provides the glue between the two services, enabling conversation
 * promotion to group with message history migration and key re-encryption
 * for all members (original + new).
 *
 * Requirements: 2.1, 2.2, 2.3
 */

import { ConversationService } from '@brightchain/brightchain-lib/lib/services/communication/conversationService';
import { GroupService } from '@brightchain/brightchain-lib/lib/services/communication/groupService';

/**
 * Connects the ConversationService's group promotion handler to the
 * GroupService's createGroupFromConversation method.
 *
 * Call this once during application initialization after both services
 * are constructed.
 *
 * @param conversationService - The ConversationService instance
 * @param groupService - The GroupService instance
 */
export function wireConversationPromotion(
  conversationService: ConversationService,
  groupService: GroupService,
): void {
  conversationService.setGroupPromotionHandler(
    (
      conversationId,
      existingParticipants,
      newMemberIds,
      messages,
      requesterId,
    ) =>
      groupService.createGroupFromConversation(
        conversationId,
        existingParticipants,
        newMemberIds,
        messages,
        requesterId,
      ),
  );
}
