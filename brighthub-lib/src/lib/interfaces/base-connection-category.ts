/**
 * Category for classifying connections
 * @template TId - The type of ID (string for frontend, GuidV4Buffer for backend)
 */
export interface IBaseConnectionCategory<TId> {
  /** Unique identifier for the category */
  _id: TId;
  /** ID of the user who owns the category */
  ownerId: TId;
  /** Name of the category */
  name: string;
  /** Color for the category (hex code) */
  color?: string;
  /** Icon for the category (FontAwesome icon name) */
  icon?: string;
  /** Whether this is a default system category */
  isDefault: boolean;
  /** Timestamp when the category was created */
  createdAt: TId extends string ? string : Date;
}
