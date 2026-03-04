import { ConnectionVisibility } from '../enumerations/connection-visibility';
import { MuteDuration } from '../enumerations/mute-duration';
import { IBaseConnectionCategory } from './base-connection-category';
import { IBaseConnectionList } from './base-connection-list';
import { IBaseConnectionNote } from './base-connection-note';
import { IBaseHub } from './base-hub';
import { IBaseUserProfile } from './base-user-profile';
import { IPaginatedResult, IPaginationOptions } from './user-profile-service';

/**
 * Options for creating a connection list
 */
export interface ICreateListOptions {
  /** Description of the list */
  description?: string;
  /** Visibility setting (defaults to Private) */
  visibility?: ConnectionVisibility;
}

/**
 * Error codes for connection service operations
 */
export enum ConnectionServiceErrorCode {
  /** List not found */
  ListNotFound = 'LIST_NOT_FOUND',
  /** Not authorized to modify this list */
  ListNotAuthorized = 'LIST_NOT_AUTHORIZED',
  /** User has reached the maximum number of lists (100) */
  ListLimitExceeded = 'LIST_LIMIT_EXCEEDED',
  /** List has reached the maximum number of members (5000) */
  ListMemberLimitExceeded = 'LIST_MEMBER_LIMIT_EXCEEDED',
  /** List name is empty or invalid */
  InvalidListName = 'INVALID_LIST_NAME',
  /** User is already a member of this list */
  AlreadyMember = 'ALREADY_MEMBER',
  /** User is not a member of this list */
  NotMember = 'NOT_MEMBER',
  /** Category not found */
  CategoryNotFound = 'CATEGORY_NOT_FOUND',
  /** Not authorized to modify this category */
  CategoryNotAuthorized = 'CATEGORY_NOT_AUTHORIZED',
  /** User has reached the maximum number of custom categories (20) */
  CategoryLimitExceeded = 'CATEGORY_LIMIT_EXCEEDED',
  /** Category name is empty or invalid */
  InvalidCategoryName = 'INVALID_CATEGORY_NAME',
  /** Category is already assigned to this connection */
  CategoryAlreadyAssigned = 'CATEGORY_ALREADY_ASSIGNED',
  /** Category is not assigned to this connection */
  CategoryNotAssigned = 'CATEGORY_NOT_ASSIGNED',
  /** Cannot delete a default category */
  CannotDeleteDefaultCategory = 'CANNOT_DELETE_DEFAULT_CATEGORY',
  /** Duplicate category name for this user */
  DuplicateCategoryName = 'DUPLICATE_CATEGORY_NAME',
  /** Note content exceeds 500 character limit */
  NoteTooLong = 'NOTE_TOO_LONG',
  /** Note content is empty or invalid */
  InvalidNoteContent = 'INVALID_NOTE_CONTENT',
  /** Note not found for this connection */
  NoteNotFound = 'NOTE_NOT_FOUND',
  /** Import rate limited - too many imports in a short period */
  ImportRateLimited = 'IMPORT_RATE_LIMITED',
  /** Invalid import format - data could not be parsed */
  InvalidImportFormat = 'INVALID_IMPORT_FORMAT',
  /** User has reached the maximum number of priority connections (50) */
  PriorityLimitExceeded = 'PRIORITY_LIMIT_EXCEEDED',
  /** Hub not found */
  HubNotFound = 'HUB_NOT_FOUND',
  /** Not authorized to modify this hub */
  HubNotAuthorized = 'HUB_NOT_AUTHORIZED',
  /** User has reached the maximum number of hubs (10) */
  HubLimitExceeded = 'HUB_LIMIT_EXCEEDED',
  /** Hub has reached the maximum number of members (150) */
  HubMemberLimitExceeded = 'HUB_MEMBER_LIMIT_EXCEEDED',
  /** Hub name is empty or invalid */
  InvalidHubName = 'INVALID_HUB_NAME',
  /** User is already a member of this hub */
  AlreadyHubMember = 'ALREADY_HUB_MEMBER',
  /** Cannot delete a default hub */
  CannotDeleteDefaultHub = 'CANNOT_DELETE_DEFAULT_HUB',
  /** List is not public, cannot follow */
  ListNotPublic = 'LIST_NOT_PUBLIC',
  /** User is already following this list */
  AlreadyFollowingList = 'ALREADY_FOLLOWING_LIST',
  /** User is not following this list */
  NotFollowingList = 'NOT_FOLLOWING_LIST',
}

/**
 * Connection service error with code and message
 */
export class ConnectionServiceError extends Error {
  constructor(
    public readonly code: ConnectionServiceErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'ConnectionServiceError';
  }
}

/**
 * Maximum number of lists per user
 */
export const MAX_LISTS_PER_USER = 100;

/**
 * Maximum number of members per list
 */
export const MAX_MEMBERS_PER_LIST = 5000;

/**
 * Maximum number of custom categories per user
 */
export const MAX_CATEGORIES_PER_USER = 20;

/**
 * Maximum note length per connection (characters)
 */
export const MAX_NOTE_LENGTH = 500;

/**
 * Maximum number of priority connections per user
 */
export const MAX_PRIORITY_CONNECTIONS = 50;

/**
 * Maximum number of hubs per user
 */
export const MAX_HUBS_PER_USER = 10;

/**
 * Maximum number of members per hub
 */
export const MAX_MEMBERS_PER_HUB = 150;

/**
 * Default hub name
 */
export const DEFAULT_HUB_NAME = 'Close Friends';

/**
 * Default connection category definitions
 */
export const DEFAULT_CONNECTION_CATEGORIES = [
  { name: 'Close Friends', color: '#E91E63', icon: 'heart' },
  { name: 'Family', color: '#9C27B0', icon: 'house' },
  { name: 'Professional', color: '#2196F3', icon: 'briefcase' },
  { name: 'Acquaintances', color: '#FF9800', icon: 'handshake' },
  { name: 'Interests', color: '#4CAF50', icon: 'star' },
] as const;

/**
 * Minimum interval between import operations per user (in milliseconds)
 * 5 minutes = 300,000 ms
 */
export const IMPORT_RATE_LIMIT_MS = 5 * 60 * 1000;

/**
 * Exported connection entry with metadata
 */
export interface IConnectionExportEntry {
  username: string;
  displayName: string;
  categories: string[];
  note?: string;
  lists: string[];
}

/**
 * JSON structure for exported connections
 * @see Requirements: 22.1
 */
export interface IConnectionExportData {
  version: string;
  exportedAt: string;
  userId: string;
  connectionCount: number;
  connections: IConnectionExportEntry[];
}

/**
 * Exported list member entry
 */
export interface IListExportMember {
  username: string;
  displayName: string;
}

/**
 * JSON structure for exported list
 * @see Requirements: 22.2
 */
export interface IListExportData {
  version: string;
  exportedAt: string;
  listName: string;
  description?: string;
  visibility: string;
  memberCount: number;
  members: IListExportMember[];
}

/**
 * Result of an import operation
 * @see Requirements: 22.3-22.6
 */
export interface IImportResult {
  /** Number of successfully imported entries */
  successCount: number;
  /** Number of skipped entries */
  skippedCount: number;
  /** Total entries processed */
  totalCount: number;
  /** Usernames that were skipped (not found) */
  skippedUsernames: string[];
  /** Errors encountered during import */
  errors: string[];
}

/**
 * Options for creating a connection category
 */
export interface ICreateCategoryOptions {
  /** Color for the category (hex code, e.g. '#FF5733') */
  color?: string;
  /** Icon for the category (FontAwesome icon name) */
  icon?: string;
}

/**
 * Interface for the Connection_Service (list management portion)
 * Handles connection lists, membership, and list lifecycle
 * @see Requirements: 19.1-19.12
 */
export interface IConnectionService {
  // ═══════════════════════════════════════════════════════
  // List CRUD Operations (Requirements 19.1, 19.6, 19.10, 19.11)
  // ═══════════════════════════════════════════════════════

  /**
   * Create a new connection list
   * @param ownerId ID of the user creating the list
   * @param name Name of the list
   * @param options Optional settings (description, visibility)
   * @returns The created connection list
   * @throws ConnectionServiceError if list limit exceeded or name invalid
   * @see Requirements: 19.1, 19.8, 19.11
   */
  createList(
    ownerId: string,
    name: string,
    options?: ICreateListOptions,
  ): Promise<IBaseConnectionList<string>>;

  /**
   * Update an existing connection list
   * @param listId ID of the list to update
   * @param ownerId ID of the list owner (for authorization)
   * @param updates Partial updates to apply
   * @returns The updated connection list
   * @throws ConnectionServiceError if list not found or not authorized
   * @see Requirements: 19.1, 19.11
   */
  updateList(
    listId: string,
    ownerId: string,
    updates: Partial<
      Pick<IBaseConnectionList<string>, 'name' | 'description' | 'visibility'>
    >,
  ): Promise<IBaseConnectionList<string>>;

  /**
   * Delete a connection list and all its memberships
   * @param listId ID of the list to delete
   * @param ownerId ID of the list owner (for authorization)
   * @throws ConnectionServiceError if list not found or not authorized
   * @see Requirements: 19.10
   */
  deleteList(listId: string, ownerId: string): Promise<void>;

  // ═══════════════════════════════════════════════════════
  // List Membership Operations (Requirements 19.2-19.5, 19.7, 19.9)
  // ═══════════════════════════════════════════════════════

  /**
   * Add members to a list (bulk support)
   * @param listId ID of the list
   * @param ownerId ID of the list owner (for authorization)
   * @param userIds IDs of users to add
   * @throws ConnectionServiceError if list not found, not authorized, or member limit exceeded
   * @see Requirements: 19.2, 19.4, 19.9
   */
  addMembersToList(
    listId: string,
    ownerId: string,
    userIds: string[],
  ): Promise<void>;

  /**
   * Remove members from a list (bulk support)
   * @param listId ID of the list
   * @param ownerId ID of the list owner (for authorization)
   * @param userIds IDs of users to remove
   * @throws ConnectionServiceError if list not found or not authorized
   * @see Requirements: 19.3, 19.5
   */
  removeMembersFromList(
    listId: string,
    ownerId: string,
    userIds: string[],
  ): Promise<void>;

  /**
   * Get members of a list with pagination
   * @param listId ID of the list
   * @param options Pagination options
   * @returns Paginated list of member profiles
   * @see Requirements: 19.7
   */
  getListMembers(
    listId: string,
    options?: IPaginationOptions,
  ): Promise<IPaginatedResult<IBaseUserProfile<string>>>;

  // ═══════════════════════════════════════════════════════
  // List Query Operations (Requirements 19.6)
  // ═══════════════════════════════════════════════════════

  /**
   * Get all lists owned by a user
   * @param ownerId ID of the user
   * @param options Pagination options
   * @returns Paginated list of connection lists
   * @see Requirements: 19.6
   */
  getUserLists(
    ownerId: string,
    options?: IPaginationOptions,
  ): Promise<IPaginatedResult<IBaseConnectionList<string>>>;

  // ═══════════════════════════════════════════════════════
  // Category Operations (Requirements 20.1-20.8)
  // ═══════════════════════════════════════════════════════

  /**
   * Create a custom connection category
   * @param ownerId ID of the user creating the category
   * @param name Name of the category
   * @param options Optional color and icon
   * @returns The created category
   * @throws ConnectionServiceError if category limit exceeded or name invalid/duplicate
   * @see Requirements: 20.2, 20.6
   */
  createCategory(
    ownerId: string,
    name: string,
    options?: ICreateCategoryOptions,
  ): Promise<IBaseConnectionCategory<string>>;

  /**
   * Assign a category to a connection
   * @param connectionId ID of the connection (followed user)
   * @param categoryId ID of the category
   * @param ownerId ID of the category owner (for authorization)
   * @throws ConnectionServiceError if category not found or not authorized
   * @see Requirements: 20.3, 20.4
   */
  assignCategory(
    connectionId: string,
    categoryId: string,
    ownerId: string,
  ): Promise<void>;

  /**
   * Remove a category assignment from a connection
   * @param connectionId ID of the connection (followed user)
   * @param categoryId ID of the category
   * @param ownerId ID of the category owner (for authorization)
   * @throws ConnectionServiceError if category not found or not assigned
   * @see Requirements: 20.3
   */
  unassignCategory(
    connectionId: string,
    categoryId: string,
    ownerId: string,
  ): Promise<void>;

  /**
   * Assign a category to multiple connections at once
   * @param connectionIds IDs of the connections
   * @param categoryId ID of the category
   * @param ownerId ID of the category owner (for authorization)
   * @throws ConnectionServiceError if category not found or not authorized
   * @see Requirements: 20.8
   */
  bulkAssignCategory(
    connectionIds: string[],
    categoryId: string,
    ownerId: string,
  ): Promise<void>;

  /**
   * Get connections by category with pagination
   * @param ownerId ID of the user
   * @param categoryId ID of the category
   * @param options Pagination options
   * @returns Paginated list of user profiles in the category
   * @see Requirements: 20.5
   */
  getConnectionsByCategory(
    ownerId: string,
    categoryId: string,
    options?: IPaginationOptions,
  ): Promise<IPaginatedResult<IBaseUserProfile<string>>>;

  /**
   * Delete a custom category and remove all assignments
   * @param categoryId ID of the category to delete
   * @param ownerId ID of the category owner (for authorization)
   * @throws ConnectionServiceError if category not found, not authorized, or is a default category
   * @see Requirements: 20.7
   */
  deleteCategory(categoryId: string, ownerId: string): Promise<void>;

  /**
   * Get or create default categories for a user
   * @param ownerId ID of the user
   * @returns Array of default categories
   * @see Requirements: 20.1
   */
  getDefaultCategories(
    ownerId: string,
  ): Promise<IBaseConnectionCategory<string>[]>;

  // ═══════════════════════════════════════════════════════
  // Connection Note Operations (Requirements 21.1-21.7)
  // ═══════════════════════════════════════════════════════

  /**
   * Add a private note to a connection
   * @param userId ID of the user creating the note
   * @param connectionId ID of the connection the note is about
   * @param note Note content (max 500 characters)
   * @returns The created connection note
   * @throws ConnectionServiceError if note exceeds 500 chars or is empty
   * @see Requirements: 21.1, 21.4
   */
  addNote(
    userId: string,
    connectionId: string,
    note: string,
  ): Promise<IBaseConnectionNote<string>>;

  /**
   * Update an existing connection note
   * @param userId ID of the note owner
   * @param connectionId ID of the connection
   * @param note Updated note content (max 500 characters)
   * @returns The updated connection note
   * @throws ConnectionServiceError if note not found or exceeds 500 chars
   * @see Requirements: 21.2, 21.4
   */
  updateNote(
    userId: string,
    connectionId: string,
    note: string,
  ): Promise<IBaseConnectionNote<string>>;

  /**
   * Delete a connection note
   * @param userId ID of the note owner
   * @param connectionId ID of the connection
   * @throws ConnectionServiceError if note not found
   * @see Requirements: 21.3
   */
  deleteNote(userId: string, connectionId: string): Promise<void>;

  /**
   * Search connections by note content
   * @param userId ID of the user
   * @param searchTerm Text to search for in notes
   * @param options Pagination options
   * @returns Paginated list of matching connection notes
   * @see Requirements: 21.6
   */
  searchConnectionsByNote(
    userId: string,
    searchTerm: string,
    options?: IPaginationOptions,
  ): Promise<IPaginatedResult<IBaseConnectionNote<string>>>;

  // ═══════════════════════════════════════════════════════
  // Import/Export Operations (Requirements 22.1-22.7)
  // ═══════════════════════════════════════════════════════

  /**
   * Export all connections with metadata as JSON
   * @param userId ID of the user whose connections to export
   * @returns JSON export data with all connections and metadata
   * @see Requirements: 22.1
   */
  exportConnections(userId: string): Promise<IConnectionExportData>;

  /**
   * Export a connection list with members as JSON
   * @param listId ID of the list to export
   * @param ownerId ID of the list owner (for authorization)
   * @returns JSON export data with list members and settings
   * @throws ConnectionServiceError if list not found or not authorized
   * @see Requirements: 22.2
   */
  exportList(listId: string, ownerId: string): Promise<IListExportData>;

  /**
   * Import connections from JSON or CSV data
   * @param userId ID of the user importing connections
   * @param data Raw string data (JSON or CSV)
   * @param format Format of the data ('json' or 'csv')
   * @returns Import result with success/failure counts and skipped usernames
   * @throws ConnectionServiceError if rate limited or invalid format
   * @see Requirements: 22.3, 22.5, 22.6, 22.7
   */
  importConnections(
    userId: string,
    data: string,
    format: 'json' | 'csv',
  ): Promise<IImportResult>;

  /**
   * Import a list from JSON or CSV data
   * @param userId ID of the user importing the list
   * @param data Raw string data (JSON or CSV)
   * @param format Format of the data ('json' or 'csv')
   * @returns Import result with success/failure counts and skipped usernames
   * @throws ConnectionServiceError if rate limited or invalid format
   * @see Requirements: 22.4, 22.5, 22.6, 22.7
   */
  importList(
    userId: string,
    data: string,
    format: 'json' | 'csv',
  ): Promise<IImportResult>;

  // ═══════════════════════════════════════════════════════
  // Priority Connection Operations (Requirements 23.1-23.5)
  // ═══════════════════════════════════════════════════════

  /**
   * Set or remove priority status for a connection
   * @param userId ID of the user setting priority
   * @param connectionId ID of the connection to prioritize
   * @param isPriority Whether to set or remove priority
   * @throws ConnectionServiceError if priority limit exceeded (when setting priority=true)
   * @see Requirements: 23.1, 23.3, 23.4
   */
  setPriority(
    userId: string,
    connectionId: string,
    isPriority: boolean,
  ): Promise<void>;

  /**
   * Get all priority-marked connections for a user
   * @param userId ID of the user
   * @param options Pagination options
   * @returns Paginated list of priority connection profiles
   * @see Requirements: 23.5
   */
  getPriorityConnections(
    userId: string,
    options?: IPaginationOptions,
  ): Promise<IPaginatedResult<IBaseUserProfile<string>>>;

  /**
   * Set or remove quiet mode for a connection.
   * Quiet mode suppresses notifications while still showing posts in the timeline.
   * @param userId ID of the user setting quiet mode
   * @param connectionId ID of the connection to set quiet mode for
   * @param isQuiet Whether to enable or disable quiet mode
   * @see Requirements: 24.1, 24.4
   */
  setQuietMode(
    userId: string,
    connectionId: string,
    isQuiet: boolean,
  ): Promise<void>;

  /**
   * Get all connections with quiet mode enabled for a user
   * @param userId ID of the user
   * @param options Pagination options
   * @returns Paginated list of quiet-mode connection profiles
   * @see Requirements: 24.5
   */
  getQuietConnections(
    userId: string,
    options?: IPaginationOptions,
  ): Promise<IPaginatedResult<IBaseUserProfile<string>>>;

  /**
   * Set a temporary mute on a connection with a specified duration.
   * Creates or updates a mute record with a calculated expiration timestamp.
   * For 'permanent' duration, sets expiresAt far in the future.
   * @param userId ID of the user setting the mute
   * @param connectionId ID of the connection to mute
   * @param duration Duration of the mute
   * @see Requirements: 25.1, 25.2
   */
  setTemporaryMute(
    userId: string,
    connectionId: string,
    duration: MuteDuration,
  ): Promise<void>;

  /**
   * Remove a temporary mute before it expires (early unmute).
   * @param userId ID of the user removing the mute
   * @param connectionId ID of the connection to unmute
   * @see Requirements: 25.7
   */
  removeTemporaryMute(userId: string, connectionId: string): Promise<void>;

  /**
   * Convert a temporary mute to a permanent mute.
   * Updates the duration to 'permanent' and sets expiresAt far in the future.
   * @param userId ID of the user converting the mute
   * @param connectionId ID of the connection whose mute to convert
   * @see Requirements: 25.6
   */
  convertToPermanentMute(userId: string, connectionId: string): Promise<void>;

  /**
   * Get all muted connections for a user with their expiration info.
   * Only returns currently active (non-expired) mutes.
   * @param userId ID of the user
   * @param options Pagination options
   * @returns Paginated list of muted connection profiles with expiresAt and duration
   * @see Requirements: 25.5
   */
  getMutedConnections(
    userId: string,
    options?: IPaginationOptions,
  ): Promise<
    IPaginatedResult<
      IBaseUserProfile<string> & { expiresAt: string; duration: string }
    >
  >;

  // ═══════════════════════════════════════════════════════
  // Hub Operations (Requirements 30.1-30.10)
  // ═══════════════════════════════════════════════════════

  /**
   * Create a new hub
   * @param ownerId ID of the user creating the hub
   * @param name Name of the hub (max 50 characters)
   * @returns The created hub
   * @throws ConnectionServiceError if hub limit exceeded or name invalid
   * @see Requirements: 30.1, 30.9
   */
  createHub(ownerId: string, name: string): Promise<IBaseHub<string>>;

  /**
   * Delete a hub and all its memberships.
   * Cannot delete the default "Close Friends" hub.
   * @param hubId ID of the hub to delete
   * @param ownerId ID of the hub owner (for authorization)
   * @throws ConnectionServiceError if hub not found, not authorized, or is default
   * @see Requirements: 30.1
   */
  deleteHub(hubId: string, ownerId: string): Promise<void>;

  /**
   * Add members to a hub (bulk support)
   * @param hubId ID of the hub
   * @param ownerId ID of the hub owner (for authorization)
   * @param userIds IDs of users to add
   * @throws ConnectionServiceError if hub not found, not authorized, or member limit exceeded
   * @see Requirements: 30.2, 30.10
   */
  addToHub(hubId: string, ownerId: string, userIds: string[]): Promise<void>;

  /**
   * Remove members from a hub (bulk support)
   * @param hubId ID of the hub
   * @param ownerId ID of the hub owner (for authorization)
   * @param userIds IDs of users to remove
   * @throws ConnectionServiceError if hub not found or not authorized
   * @see Requirements: 30.2
   */
  removeFromHub(
    hubId: string,
    ownerId: string,
    userIds: string[],
  ): Promise<void>;

  /**
   * Get all hubs owned by a user
   * @param ownerId ID of the user
   * @returns Array of hubs
   * @see Requirements: 30.1
   */
  getHubs(ownerId: string): Promise<IBaseHub<string>[]>;

  /**
   * Get members of a hub with pagination
   * @param hubId ID of the hub
   * @param options Pagination options
   * @returns Paginated list of member profiles
   * @see Requirements: 30.2
   */
  getHubMembers(
    hubId: string,
    options?: IPaginationOptions,
  ): Promise<IPaginatedResult<IBaseUserProfile<string>>>;

  /**
   * Get or create the default "Close Friends" hub for a user.
   * Creates the hub if it doesn't already exist.
   * @param ownerId ID of the user
   * @returns The default hub
   * @see Requirements: 30.6
   */
  getOrCreateDefaultHub(ownerId: string): Promise<IBaseHub<string>>;

  // ── Mutual Connections ──────────────────────────────────────────────

  /**
   * Get mutual connections between two users (users both follow).
   * @param userId ID of the requesting user
   * @param otherUserId ID of the other user
   * @param options Pagination options
   * @returns Paginated list of mutual connection profiles
   * @see Requirements: 28.1, 28.2
   */
  getMutualConnections(
    userId: string,
    otherUserId: string,
    options?: IPaginationOptions,
  ): Promise<IPaginatedResult<IBaseUserProfile<string>>>;

  /**
   * Get the count of mutual connections between two users.
   * Results are cached for performance.
   * @param userId ID of the requesting user
   * @param otherUserId ID of the other user
   * @returns Number of mutual connections
   * @see Requirements: 28.1, 28.5
   */
  getMutualConnectionCount(
    userId: string,
    otherUserId: string,
  ): Promise<number>;

  // ═══════════════════════════════════════════════════════
  // Block/Mute Inheritance for Lists (Requirements 32.1-32.5)
  // ═══════════════════════════════════════════════════════

  /**
   * Remove a blocked user from ALL lists owned by the blocker.
   * Called when a block is created to enforce block inheritance on lists.
   * @param ownerId ID of the list owner (blocker)
   * @param blockedUserId ID of the blocked user to remove
   * @see Requirements: 32.1
   */
  removeBlockedUserFromLists(
    ownerId: string,
    blockedUserId: string,
  ): Promise<void>;

  /**
   * Check if a user is blocked by the list owner.
   * Used to prevent blocked users from viewing or following a list.
   * @param userId ID of the user to check
   * @param listOwnerId ID of the list owner
   * @returns true if userId is blocked by listOwnerId
   * @see Requirements: 32.2, 32.3
   */
  isBlockedFromList(userId: string, listOwnerId: string): Promise<boolean>;

  // ═══════════════════════════════════════════════════════
  // List Following Operations
  // ═══════════════════════════════════════════════════════

  /**
   * Follow a public list. Creates a subscription so the user can view
   * the list timeline. Only public lists can be followed.
   * @param userId ID of the user following the list
   * @param listId ID of the list to follow
   * @throws ListNotFound if list does not exist
   * @throws ListNotPublic if list is not public
   * @throws AlreadyFollowingList if already following
   * @see Requirements: 33.1
   */
  followList(userId: string, listId: string): Promise<void>;

  /**
   * Unfollow a list, removing the subscription.
   * @param userId ID of the user unfollowing the list
   * @param listId ID of the list to unfollow
   * @throws NotFollowingList if not currently following
   * @see Requirements: 33.5
   */
  unfollowList(userId: string, listId: string): Promise<void>;

  /**
   * Get all followers of a list with pagination.
   * @param listId ID of the list
   * @param options Pagination options
   * @returns Paginated list of follower profiles
   * @see Requirements: 33.6
   */
  getListFollowers(
    listId: string,
    options?: IPaginationOptions,
  ): Promise<IPaginatedResult<IBaseUserProfile<string>>>;

  /**
   * Get all lists a user follows with pagination.
   * @param userId ID of the user
   * @param options Pagination options
   * @returns Paginated list of followed lists
   * @see Requirements: 33.6
   */
  getFollowedLists(
    userId: string,
    options?: IPaginationOptions,
  ): Promise<IPaginatedResult<IBaseConnectionList<string>>>;

  /**
   * Remove all non-owner followers when a list becomes private.
   * Resets the list's followerCount to 0.
   * @param listId ID of the list
   * @param ownerId ID of the list owner
   * @see Requirements: 33.7
   */
  removeNonOwnerFollowersOnPrivate(
    listId: string,
    ownerId: string,
  ): Promise<void>;
}
