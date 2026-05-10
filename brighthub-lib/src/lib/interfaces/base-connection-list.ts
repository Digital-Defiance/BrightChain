import { ConnectionVisibility } from '../enumerations/connection-visibility';

/**
 * Connection list for organizing followed users
 * @template TId - The type of ID (string for frontend, GuidV4Buffer for backend)
 */
export interface IBaseConnectionList<TId> {
  /** Unique identifier for the list */
  _id: TId;
  /** ID of the user who owns the list */
  ownerId: TId;
  /** Name of the list */
  name: string;
  /** Description of the list */
  description?: string;
  /** Visibility setting for the list */
  visibility: ConnectionVisibility;
  /** Number of members in the list */
  memberCount: number;
  /** Number of users following this list */
  followerCount: number;
  /** Timestamp when the list was created */
  createdAt: TId extends string ? string : Date;
  /** Timestamp when the list was last updated */
  updatedAt: TId extends string ? string : Date;
}
