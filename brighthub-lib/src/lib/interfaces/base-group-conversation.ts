import { ConversationType } from '../enumerations/conversation-type';
import { IBaseConversation } from './base-conversation';

/**
 * Group conversation with admin management
 * @template TId - The type of ID (string for frontend, GuidV4Buffer for backend)
 */
export interface IBaseGroupConversation<TId> extends IBaseConversation<TId> {
  /** Type is always Group for group conversations */
  type: ConversationType.Group;
  /** IDs of admin users */
  adminIds: TId[];
  /** ID of the user who created the group */
  creatorId: TId;
}
