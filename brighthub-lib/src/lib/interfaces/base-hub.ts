/**
 * Hub for sharing content with a select group
 * @template TId - The type of ID (string for frontend, GuidV4Buffer for backend)
 */
export interface IBaseHub<TId> {
  /** Unique identifier for the hub */
  _id: TId;
  /** ID of the user who owns the hub */
  ownerId: TId;
  /** Name of the hub */
  name: string;
  /** Number of members in the hub */
  memberCount: number;
  /** Whether this is the default "Close Friends" hub */
  isDefault: boolean;
  /** Timestamp when the hub was created */
  createdAt: TId extends string ? string : Date;
}
