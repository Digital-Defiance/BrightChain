/**
 * Group of aggregated notifications
 * @template TId - The type of ID (string for frontend, GuidV4Buffer for backend)
 */
export interface IBaseNotificationGroup<TId> {
  /** Unique identifier for the group */
  _id: TId;
  /** Key used to group notifications (e.g., "like:postId") */
  groupKey: string;
  /** IDs of notifications in this group */
  notificationIds: TId[];
  /** IDs of actors who triggered notifications in this group */
  actorIds: TId[];
  /** Total count of notifications in the group */
  count: number;
  /** Timestamp of the most recent notification in the group */
  latestAt: TId extends string ? string : Date;
}
