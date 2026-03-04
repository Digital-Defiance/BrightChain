/**
 * Private note attached to a connection
 * @template TId - The type of ID (string for frontend, GuidV4Buffer for backend)
 */
export interface IBaseConnectionNote<TId> {
  /** Unique identifier for the note */
  _id: TId;
  /** ID of the user who created the note */
  userId: TId;
  /** ID of the connection the note is about */
  connectionId: TId;
  /** Content of the note (max 500 characters) */
  note: string;
  /** Timestamp when the note was created */
  createdAt: TId extends string ? string : Date;
  /** Timestamp when the note was last updated */
  updatedAt: TId extends string ? string : Date;
}
