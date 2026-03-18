import {
  ConnectionServiceError,
  ConnectionServiceErrorCode,
  ConnectionVisibility,
  DEFAULT_CONNECTION_CATEGORIES,
  DEFAULT_HUB_NAME,
  IBaseConnectionCategory,
  IBaseConnectionList,
  IBaseConnectionNote,
  IBaseHub,
  IBaseUserProfile,
  IConnectionExportData,
  IConnectionService,
  ICreateCategoryOptions,
  ICreateListOptions,
  IImportResult,
  IListExportData,
  IMPORT_RATE_LIMIT_MS,
  IPaginatedResult,
  IPaginationOptions,
  MAX_CATEGORIES_PER_USER,
  MAX_HUBS_PER_USER,
  MAX_LISTS_PER_USER,
  MAX_MEMBERS_PER_HUB,
  MAX_MEMBERS_PER_LIST,
  MAX_NOTE_LENGTH,
  MAX_PRIORITY_CONNECTIONS,
  MuteDuration,
} from '@brightchain/brighthub-lib';
import { randomUUID } from 'crypto';

/**
 * Default pagination limit
 */
const DEFAULT_PAGE_LIMIT = 20;

/**
 * Maximum pagination limit
 */
const MAX_PAGE_LIMIT = 100;

/**
 * Database record type for connection lists
 */
interface ConnectionListRecord {
  _id: string;
  ownerId: string;
  name: string;
  description?: string;
  visibility: string;
  memberCount: number;
  followerCount: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Database record type for connection list members
 */
interface ConnectionListMemberRecord {
  _id: string;
  listId: string;
  userId: string;
  addedAt: string;
}

/**
 * Database record type for user profiles (for member lookups)
 */
interface UserProfileRecord {
  _id: string;
  username: string;
  displayName: string;
  bio: string;
  profilePictureUrl?: string;
  headerImageUrl?: string;
  location?: string;
  websiteUrl?: string;
  followerCount: number;
  followingCount: number;
  postCount: number;
  isVerified: boolean;
  isProtected: boolean;
  approveFollowersMode: string;
  privacySettings: Record<string, unknown>;
  createdAt: string;
  updatedAt?: string;
}

/**
 * Database record type for connection categories
 */
interface ConnectionCategoryRecord {
  _id: string;
  ownerId: string;
  name: string;
  color?: string;
  icon?: string;
  isDefault: boolean;
  createdAt: string;
}

/**
 * Database record type for connection category assignments
 */
interface ConnectionCategoryAssignmentRecord {
  _id: string;
  ownerId: string;
  connectionId: string;
  categoryId: string;
  assignedAt: string;
}

/**
 * Database record type for connection notes
 */
interface ConnectionNoteRecord {
  _id: string;
  userId: string;
  connectionId: string;
  note: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Database record type for follows (used for import/export)
 */
interface FollowRecord {
  _id: string;
  followerId: string;
  followedId: string;
  createdAt: string;
}

/**
 * Database record type for connection metadata (priority, quiet mode, etc.)
 */
interface ConnectionMetadataRecord {
  _id: string;
  userId: string;
  connectionId: string;
  isPriority: boolean;
  isQuiet: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Database record type for temporary mutes
 */
interface TemporaryMuteRecord {
  _id: string;
  userId: string;
  connectionId: string;
  duration: string;
  expiresAt: string;
  createdAt: string;
}

/**
 * Database record type for hubs
 */
interface HubRecord {
  _id: string;
  ownerId: string;
  slug?: string;
  name: string;
  description?: string;
  rules?: string;
  memberCount: number;
  postCount: number;
  isDefault: boolean;
  trustTier?: string;
  parentHubId?: string;
  icon?: string;
  moderatorIds?: string[];
  createdAt: string;
}

/**
 * Database record type for hub members
 */
interface HubMemberRecord {
  _id: string;
  hubId: string;
  userId: string;
  addedAt: string;
}

/**
 * Database record type for hub banned users
 */
interface HubBannedUserRecord {
  _id: string;
  hubId: string;
  userId: string;
  bannedBy: string;
  reason?: string;
  severity: 'warning' | 'temp_ban' | 'permanent_ban';
  expiresAt?: string;
  bannedAt: string;
}

/**
 * Database record type for blocks (mirrors UserProfileService's BlockRecord)
 */
interface BlockRecord {
  _id: string;
  blockerId: string;
  blockedId: string;
  createdAt: string;
}

/**
 * Database record type for connection list followers
 */
interface ListFollowerRecord {
  _id: string;
  listId: string;
  userId: string;
  followedAt: string;
}

/**
 * Find query interface for chaining
 */
interface FindQuery<T> {
  sort?(field: Record<string, 1 | -1>): FindQuery<T>;
  skip?(count: number): FindQuery<T>;
  limit?(count: number): FindQuery<T>;
  exec(): Promise<T[]>;
}

/**
 * Collection interface for database operations
 */
interface Collection<T> {
  create(record: T): Promise<T>;
  findOne(filter: Partial<T>): { exec(): Promise<T | null> };
  find(filter: Partial<T>): FindQuery<T>;
  updateOne(
    filter: Partial<T>,
    update: Partial<T>,
  ): { exec(): Promise<{ modifiedCount: number }> };
  deleteOne(filter: Partial<T>): { exec(): Promise<{ deletedCount: number }> };
  countDocuments?(filter: Partial<T>): { exec(): Promise<number> };
}

/**
 * Application interface for accessing database collections
 */
interface IApplicationWithCollections {
  getModel<T>(name: string): Collection<T>;
}

/**
 * Connection_Service implementation (list management)
 * Handles connection lists, membership, and list lifecycle
 * @see Requirements: 19.1-19.12
 */
export class ConnectionService implements IConnectionService {
  private readonly listsCollection: Collection<ConnectionListRecord>;
  private readonly listMembersCollection: Collection<ConnectionListMemberRecord>;
  private readonly userProfilesCollection: Collection<UserProfileRecord>;
  private readonly categoriesCollection: Collection<ConnectionCategoryRecord>;
  private readonly categoryAssignmentsCollection: Collection<ConnectionCategoryAssignmentRecord>;
  private readonly notesCollection: Collection<ConnectionNoteRecord>;
  private readonly followsCollection: Collection<FollowRecord>;
  private readonly metadataCollection: Collection<ConnectionMetadataRecord>;
  private readonly temporaryMutesCollection: Collection<TemporaryMuteRecord>;
  private readonly hubsCollection: Collection<HubRecord>;
  private readonly hubMembersCollection: Collection<HubMemberRecord>;
  private readonly hubBannedUsersCollection: Collection<HubBannedUserRecord>;
  private readonly blocksCollection: Collection<BlockRecord>;
  private readonly listFollowersCollection: Collection<ListFollowerRecord>;

  /** Tracks last import timestamp per user for rate limiting */
  private readonly lastImportTimestamps: Map<string, number> = new Map();

  /** Cache for mutual connection counts with TTL of 5 minutes */
  private readonly mutualConnectionCache: Map<
    string,
    { count: number; timestamp: number }
  > = new Map();

  /** TTL for mutual connection cache entries in milliseconds (5 minutes) */
  private static readonly MUTUAL_CACHE_TTL_MS = 5 * 60 * 1000;

  constructor(application: IApplicationWithCollections) {
    this.listsCollection = application.getModel<ConnectionListRecord>(
      'brighthub_connection_lists',
    );
    this.listMembersCollection =
      application.getModel<ConnectionListMemberRecord>(
        'brighthub_connection_list_members',
      );
    this.userProfilesCollection = application.getModel<UserProfileRecord>(
      'brighthub_user_profiles',
    );
    this.categoriesCollection = application.getModel<ConnectionCategoryRecord>(
      'brighthub_connection_categories',
    );
    this.categoryAssignmentsCollection =
      application.getModel<ConnectionCategoryAssignmentRecord>(
        'brighthub_connection_category_assignments',
      );
    this.notesCollection = application.getModel<ConnectionNoteRecord>(
      'brighthub_connection_notes',
    );
    this.followsCollection =
      application.getModel<FollowRecord>('brighthub_follows');
    this.metadataCollection = application.getModel<ConnectionMetadataRecord>(
      'brighthub_connection_metadata',
    );
    this.temporaryMutesCollection = application.getModel<TemporaryMuteRecord>(
      'brighthub_temporary_mutes',
    );
    this.hubsCollection = application.getModel<HubRecord>('brighthub_hubs');
    this.hubMembersCollection = application.getModel<HubMemberRecord>(
      'brighthub_hub_members',
    );
    this.hubBannedUsersCollection =
      application.getModel<HubBannedUserRecord>(
        'brighthub_hub_banned_users',
      );
    this.blocksCollection =
      application.getModel<BlockRecord>('brighthub_blocks');
    this.listFollowersCollection = application.getModel<ListFollowerRecord>(
      'brighthub_connection_list_followers',
    );
  }

  /**
   * Convert a database record to the API response format
   */
  private recordToList(
    record: ConnectionListRecord,
  ): IBaseConnectionList<string> {
    return {
      _id: record._id,
      ownerId: record.ownerId,
      name: record.name,
      description: record.description,
      visibility: record.visibility as ConnectionVisibility,
      memberCount: record.memberCount,
      followerCount: record.followerCount,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  /**
   * Convert a user profile record to the API response format
   */
  private recordToProfile(record: UserProfileRecord): IBaseUserProfile<string> {
    return {
      _id: record._id,
      username: record.username,
      displayName: record.displayName,
      bio: record.bio,
      profilePictureUrl: record.profilePictureUrl,
      headerImageUrl: record.headerImageUrl,
      location: record.location,
      websiteUrl: record.websiteUrl,
      followerCount: record.followerCount,
      followingCount: record.followingCount,
      postCount: record.postCount,
      isVerified: record.isVerified,
      isProtected: record.isProtected,
      approveFollowersMode:
        record.approveFollowersMode as IBaseUserProfile<string>['approveFollowersMode'],
      privacySettings:
        record.privacySettings as unknown as IBaseUserProfile<string>['privacySettings'],
      createdAt: record.createdAt,
    };
  }

  /**
   * Convert a category database record to the API response format
   */
  private recordToCategory(
    record: ConnectionCategoryRecord,
  ): IBaseConnectionCategory<string> {
    return {
      _id: record._id,
      ownerId: record.ownerId,
      name: record.name,
      color: record.color,
      icon: record.icon,
      isDefault: record.isDefault,
      createdAt: record.createdAt,
    };
  }

  /**
   * Get effective pagination limit
   */
  private getLimit(options?: IPaginationOptions): number {
    const limit = options?.limit ?? DEFAULT_PAGE_LIMIT;
    return Math.min(Math.max(1, limit), MAX_PAGE_LIMIT);
  }

  /**
   * Validate and retrieve a list, ensuring the caller is the owner
   */
  private async getOwnedList(
    listId: string,
    ownerId: string,
  ): Promise<ConnectionListRecord> {
    const list = await this.listsCollection
      .findOne({ _id: listId } as Partial<ConnectionListRecord>)
      .exec();

    if (!list) {
      throw new ConnectionServiceError(
        ConnectionServiceErrorCode.ListNotFound,
        `List with ID '${listId}' not found`,
      );
    }

    if (list.ownerId !== ownerId) {
      throw new ConnectionServiceError(
        ConnectionServiceErrorCode.ListNotAuthorized,
        'Not authorized to modify this list',
      );
    }

    return list;
  }

  // ═══════════════════════════════════════════════════════
  // List CRUD Operations
  // ═══════════════════════════════════════════════════════

  async createList(
    ownerId: string,
    name: string,
    options?: ICreateListOptions,
  ): Promise<IBaseConnectionList<string>> {
    // Validate name
    if (!name || !name.trim()) {
      throw new ConnectionServiceError(
        ConnectionServiceErrorCode.InvalidListName,
        'List name cannot be empty',
      );
    }

    // Enforce 100 lists per user limit
    const existingLists = await this.listsCollection
      .find({ ownerId } as Partial<ConnectionListRecord>)
      .exec();

    if (existingLists.length >= MAX_LISTS_PER_USER) {
      throw new ConnectionServiceError(
        ConnectionServiceErrorCode.ListLimitExceeded,
        `Cannot create more than ${MAX_LISTS_PER_USER} lists`,
      );
    }

    const now = new Date().toISOString();
    const record: ConnectionListRecord = {
      _id: randomUUID(),
      ownerId,
      name: name.trim(),
      description: options?.description,
      visibility: options?.visibility ?? ConnectionVisibility.Private,
      memberCount: 0,
      followerCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    await this.listsCollection.create(record);
    return this.recordToList(record);
  }

  async updateList(
    listId: string,
    ownerId: string,
    updates: Partial<
      Pick<IBaseConnectionList<string>, 'name' | 'description' | 'visibility'>
    >,
  ): Promise<IBaseConnectionList<string>> {
    const list = await this.getOwnedList(listId, ownerId);

    // Validate name if being updated
    if (updates.name !== undefined && (!updates.name || !updates.name.trim())) {
      throw new ConnectionServiceError(
        ConnectionServiceErrorCode.InvalidListName,
        'List name cannot be empty',
      );
    }

    const now = new Date().toISOString();
    const updateFields: Partial<ConnectionListRecord> = {
      updatedAt: now,
    };

    if (updates.name !== undefined) {
      updateFields.name = updates.name.trim();
    }
    if (updates.description !== undefined) {
      updateFields.description = updates.description;
    }
    if (updates.visibility !== undefined) {
      updateFields.visibility = updates.visibility;
    }

    await this.listsCollection
      .updateOne({ _id: listId } as Partial<ConnectionListRecord>, updateFields)
      .exec();

    // When visibility changes to Private, remove all external followers
    if (
      updates.visibility === ConnectionVisibility.Private &&
      list.visibility !== ConnectionVisibility.Private
    ) {
      await this.removeNonOwnerFollowersOnPrivate(listId, ownerId);
    }

    // Return updated list
    return this.recordToList({
      ...list,
      ...updateFields,
    });
  }

  async deleteList(listId: string, ownerId: string): Promise<void> {
    await this.getOwnedList(listId, ownerId);

    // Cascade: remove all memberships for this list
    const members = await this.listMembersCollection
      .find({ listId } as Partial<ConnectionListMemberRecord>)
      .exec();

    for (const member of members) {
      await this.listMembersCollection
        .deleteOne({ _id: member._id } as Partial<ConnectionListMemberRecord>)
        .exec();
    }

    // Cascade: remove all followers for this list
    const followers = await this.listFollowersCollection
      .find({ listId } as Partial<ListFollowerRecord>)
      .exec();

    for (const follower of followers) {
      await this.listFollowersCollection
        .deleteOne({ _id: follower._id } as Partial<ListFollowerRecord>)
        .exec();
    }

    // Delete the list itself
    await this.listsCollection
      .deleteOne({ _id: listId } as Partial<ConnectionListRecord>)
      .exec();
  }

  // ═══════════════════════════════════════════════════════
  // List Membership Operations
  // ═══════════════════════════════════════════════════════

  async addMembersToList(
    listId: string,
    ownerId: string,
    userIds: string[],
  ): Promise<void> {
    const list = await this.getOwnedList(listId, ownerId);

    if (userIds.length === 0) {
      return;
    }

    // Check member limit
    const newTotal = list.memberCount + userIds.length;
    if (newTotal > MAX_MEMBERS_PER_LIST) {
      throw new ConnectionServiceError(
        ConnectionServiceErrorCode.ListMemberLimitExceeded,
        `Cannot exceed ${MAX_MEMBERS_PER_LIST} members per list`,
      );
    }

    const now = new Date().toISOString();
    let addedCount = 0;

    for (const userId of userIds) {
      // Check if already a member (skip duplicates)
      const existing = await this.listMembersCollection
        .findOne({
          listId,
          userId,
        } as Partial<ConnectionListMemberRecord>)
        .exec();

      if (!existing) {
        await this.listMembersCollection.create({
          _id: randomUUID(),
          listId,
          userId,
          addedAt: now,
        });
        addedCount++;
      }
    }

    // Update member count
    if (addedCount > 0) {
      await this.listsCollection
        .updateOne(
          { _id: listId } as Partial<ConnectionListRecord>,
          {
            memberCount: list.memberCount + addedCount,
            updatedAt: now,
          } as Partial<ConnectionListRecord>,
        )
        .exec();
    }
  }

  async removeMembersFromList(
    listId: string,
    ownerId: string,
    userIds: string[],
  ): Promise<void> {
    const list = await this.getOwnedList(listId, ownerId);

    if (userIds.length === 0) {
      return;
    }

    let removedCount = 0;

    for (const userId of userIds) {
      const result = await this.listMembersCollection
        .deleteOne({
          listId,
          userId,
        } as Partial<ConnectionListMemberRecord>)
        .exec();

      if (result.deletedCount > 0) {
        removedCount++;
      }
    }

    // Update member count
    if (removedCount > 0) {
      const newCount = Math.max(0, list.memberCount - removedCount);
      await this.listsCollection
        .updateOne(
          { _id: listId } as Partial<ConnectionListRecord>,
          {
            memberCount: newCount,
            updatedAt: new Date().toISOString(),
          } as Partial<ConnectionListRecord>,
        )
        .exec();
    }
  }

  async getListMembers(
    listId: string,
    options?: IPaginationOptions,
  ): Promise<IPaginatedResult<IBaseUserProfile<string>>> {
    // Verify list exists
    const list = await this.listsCollection
      .findOne({ _id: listId } as Partial<ConnectionListRecord>)
      .exec();

    if (!list) {
      throw new ConnectionServiceError(
        ConnectionServiceErrorCode.ListNotFound,
        `List with ID '${listId}' not found`,
      );
    }

    const limit = this.getLimit(options);
    // Fetch one extra to determine hasMore
    const queryLimit = limit + 1;

    let query = this.listMembersCollection.find({
      listId,
    } as Partial<ConnectionListMemberRecord>);

    if (query.sort) {
      query = query.sort({ addedAt: -1 });
    }

    // Apply cursor-based pagination (cursor is the addedAt timestamp)
    const allMembers = await query.exec();
    let filteredMembers = allMembers;

    if (options?.cursor) {
      filteredMembers = allMembers.filter((m) => m.addedAt < options.cursor!);
    }

    const paginatedMembers = filteredMembers.slice(0, queryLimit);
    const hasMore = paginatedMembers.length > limit;
    const resultMembers = hasMore
      ? paginatedMembers.slice(0, limit)
      : paginatedMembers;

    // Look up user profiles for each member
    const profiles: IBaseUserProfile<string>[] = [];
    for (const member of resultMembers) {
      const userRecord = await this.userProfilesCollection
        .findOne({ _id: member.userId } as Partial<UserProfileRecord>)
        .exec();

      if (userRecord) {
        profiles.push(this.recordToProfile(userRecord));
      }
    }

    const lastMember = resultMembers[resultMembers.length - 1];
    return {
      items: profiles,
      cursor: hasMore && lastMember ? lastMember.addedAt : undefined,
      hasMore,
    };
  }

  // ═══════════════════════════════════════════════════════
  // List Query Operations
  // ═══════════════════════════════════════════════════════

  async getUserLists(
    ownerId: string,
    options?: IPaginationOptions,
  ): Promise<IPaginatedResult<IBaseConnectionList<string>>> {
    const limit = this.getLimit(options);
    const queryLimit = limit + 1;

    let query = this.listsCollection.find({
      ownerId,
    } as Partial<ConnectionListRecord>);

    if (query.sort) {
      query = query.sort({ createdAt: -1 });
    }

    const allLists = await query.exec();
    let filteredLists = allLists;

    if (options?.cursor) {
      filteredLists = allLists.filter((l) => l.createdAt < options.cursor!);
    }

    const paginatedLists = filteredLists.slice(0, queryLimit);
    const hasMore = paginatedLists.length > limit;
    const resultLists = hasMore
      ? paginatedLists.slice(0, limit)
      : paginatedLists;

    const lastList = resultLists[resultLists.length - 1];
    return {
      items: resultLists.map((r) => this.recordToList(r)),
      cursor: hasMore && lastList ? lastList.createdAt : undefined,
      hasMore,
    };
  }

  // ═══════════════════════════════════════════════════════
  // Category Helper Methods
  // ═══════════════════════════════════════════════════════

  /**
   * Validate and retrieve a category, ensuring the caller is the owner
   */
  private async getOwnedCategory(
    categoryId: string,
    ownerId: string,
  ): Promise<ConnectionCategoryRecord> {
    const category = await this.categoriesCollection
      .findOne({ _id: categoryId } as Partial<ConnectionCategoryRecord>)
      .exec();

    if (!category) {
      throw new ConnectionServiceError(
        ConnectionServiceErrorCode.CategoryNotFound,
        `Category with ID '${categoryId}' not found`,
      );
    }

    if (category.ownerId !== ownerId) {
      throw new ConnectionServiceError(
        ConnectionServiceErrorCode.CategoryNotAuthorized,
        'Not authorized to modify this category',
      );
    }

    return category;
  }

  // ═══════════════════════════════════════════════════════
  // Category CRUD Operations (Requirements 20.1-20.8)
  // ═══════════════════════════════════════════════════════

  async createCategory(
    ownerId: string,
    name: string,
    options?: ICreateCategoryOptions,
  ): Promise<IBaseConnectionCategory<string>> {
    // Validate name
    if (!name || !name.trim()) {
      throw new ConnectionServiceError(
        ConnectionServiceErrorCode.InvalidCategoryName,
        'Category name cannot be empty',
      );
    }

    // Check for duplicate name
    const existingByName = await this.categoriesCollection
      .find({ ownerId } as Partial<ConnectionCategoryRecord>)
      .exec();

    const duplicateName = existingByName.find(
      (c) => c.name.toLowerCase() === name.trim().toLowerCase(),
    );
    if (duplicateName) {
      throw new ConnectionServiceError(
        ConnectionServiceErrorCode.DuplicateCategoryName,
        `A category named '${name.trim()}' already exists`,
      );
    }

    // Enforce 20 custom categories per user limit (default categories don't count)
    const customCategories = existingByName.filter((c) => !c.isDefault);
    if (customCategories.length >= MAX_CATEGORIES_PER_USER) {
      throw new ConnectionServiceError(
        ConnectionServiceErrorCode.CategoryLimitExceeded,
        `Cannot create more than ${MAX_CATEGORIES_PER_USER} custom categories`,
      );
    }

    const now = new Date().toISOString();
    const record: ConnectionCategoryRecord = {
      _id: randomUUID(),
      ownerId,
      name: name.trim(),
      color: options?.color,
      icon: options?.icon,
      isDefault: false,
      createdAt: now,
    };

    await this.categoriesCollection.create(record);
    return this.recordToCategory(record);
  }

  async assignCategory(
    connectionId: string,
    categoryId: string,
    ownerId: string,
  ): Promise<void> {
    // Verify category exists and belongs to the owner
    await this.getOwnedCategory(categoryId, ownerId);

    // Check if already assigned
    const existing = await this.categoryAssignmentsCollection
      .findOne({
        connectionId,
        categoryId,
      } as Partial<ConnectionCategoryAssignmentRecord>)
      .exec();

    if (existing) {
      throw new ConnectionServiceError(
        ConnectionServiceErrorCode.CategoryAlreadyAssigned,
        'Category is already assigned to this connection',
      );
    }

    const now = new Date().toISOString();
    await this.categoryAssignmentsCollection.create({
      _id: randomUUID(),
      ownerId,
      connectionId,
      categoryId,
      assignedAt: now,
    });
  }

  async unassignCategory(
    connectionId: string,
    categoryId: string,
    ownerId: string,
  ): Promise<void> {
    // Verify category exists and belongs to the owner
    await this.getOwnedCategory(categoryId, ownerId);

    const result = await this.categoryAssignmentsCollection
      .deleteOne({
        connectionId,
        categoryId,
      } as Partial<ConnectionCategoryAssignmentRecord>)
      .exec();

    if (result.deletedCount === 0) {
      throw new ConnectionServiceError(
        ConnectionServiceErrorCode.CategoryNotAssigned,
        'Category is not assigned to this connection',
      );
    }
  }

  async bulkAssignCategory(
    connectionIds: string[],
    categoryId: string,
    ownerId: string,
  ): Promise<void> {
    if (connectionIds.length === 0) {
      return;
    }

    // Verify category exists and belongs to the owner
    await this.getOwnedCategory(categoryId, ownerId);

    const now = new Date().toISOString();

    for (const connectionId of connectionIds) {
      // Skip if already assigned
      const existing = await this.categoryAssignmentsCollection
        .findOne({
          connectionId,
          categoryId,
        } as Partial<ConnectionCategoryAssignmentRecord>)
        .exec();

      if (!existing) {
        await this.categoryAssignmentsCollection.create({
          _id: randomUUID(),
          ownerId,
          connectionId,
          categoryId,
          assignedAt: now,
        });
      }
    }
  }

  async getConnectionsByCategory(
    ownerId: string,
    categoryId: string,
    options?: IPaginationOptions,
  ): Promise<IPaginatedResult<IBaseUserProfile<string>>> {
    // Verify category exists and belongs to the owner
    await this.getOwnedCategory(categoryId, ownerId);

    const limit = this.getLimit(options);
    const queryLimit = limit + 1;

    // Get all assignments for this category
    let query = this.categoryAssignmentsCollection.find({
      ownerId,
      categoryId,
    } as Partial<ConnectionCategoryAssignmentRecord>);

    if (query.sort) {
      query = query.sort({ assignedAt: -1 });
    }

    const allAssignments = await query.exec();
    let filteredAssignments = allAssignments;

    if (options?.cursor) {
      filteredAssignments = allAssignments.filter(
        (a) => a.assignedAt < options.cursor!,
      );
    }

    const paginatedAssignments = filteredAssignments.slice(0, queryLimit);
    const hasMore = paginatedAssignments.length > limit;
    const resultAssignments = hasMore
      ? paginatedAssignments.slice(0, limit)
      : paginatedAssignments;

    // Look up user profiles for each connection
    const profiles: IBaseUserProfile<string>[] = [];
    for (const assignment of resultAssignments) {
      const userRecord = await this.userProfilesCollection
        .findOne({
          _id: assignment.connectionId,
        } as Partial<UserProfileRecord>)
        .exec();

      if (userRecord) {
        profiles.push(this.recordToProfile(userRecord));
      }
    }

    const lastAssignment = resultAssignments[resultAssignments.length - 1];
    return {
      items: profiles,
      cursor: hasMore && lastAssignment ? lastAssignment.assignedAt : undefined,
      hasMore,
    };
  }

  async deleteCategory(categoryId: string, ownerId: string): Promise<void> {
    const category = await this.getOwnedCategory(categoryId, ownerId);

    // Prevent deleting default categories
    if (category.isDefault) {
      throw new ConnectionServiceError(
        ConnectionServiceErrorCode.CannotDeleteDefaultCategory,
        'Cannot delete a default category',
      );
    }

    // Remove all assignments for this category
    const assignments = await this.categoryAssignmentsCollection
      .find({ categoryId } as Partial<ConnectionCategoryAssignmentRecord>)
      .exec();

    for (const assignment of assignments) {
      await this.categoryAssignmentsCollection
        .deleteOne({
          _id: assignment._id,
        } as Partial<ConnectionCategoryAssignmentRecord>)
        .exec();
    }

    // Delete the category itself
    await this.categoriesCollection
      .deleteOne({ _id: categoryId } as Partial<ConnectionCategoryRecord>)
      .exec();
  }

  async getDefaultCategories(
    ownerId: string,
  ): Promise<IBaseConnectionCategory<string>[]> {
    // Check if default categories already exist for this user
    const existingCategories = await this.categoriesCollection
      .find({ ownerId, isDefault: true } as Partial<ConnectionCategoryRecord>)
      .exec();

    if (existingCategories.length > 0) {
      return existingCategories.map((r) => this.recordToCategory(r));
    }

    // Create default categories
    const now = new Date().toISOString();
    const created: IBaseConnectionCategory<string>[] = [];

    for (const def of DEFAULT_CONNECTION_CATEGORIES) {
      const record: ConnectionCategoryRecord = {
        _id: randomUUID(),
        ownerId,
        name: def.name,
        color: def.color,
        icon: def.icon,
        isDefault: true,
        createdAt: now,
      };

      await this.categoriesCollection.create(record);
      created.push(this.recordToCategory(record));
    }

    return created;
  }

  // ═══════════════════════════════════════════════════════
  // Connection Note Operations (Requirements 21.1-21.7)
  // ═══════════════════════════════════════════════════════

  /**
   * Validate note content
   * @throws ConnectionServiceError if note is empty or exceeds limit
   */
  private validateNoteContent(note: string): void {
    if (!note || !note.trim()) {
      throw new ConnectionServiceError(
        ConnectionServiceErrorCode.InvalidNoteContent,
        'Note content cannot be empty',
      );
    }
    if (note.length > MAX_NOTE_LENGTH) {
      throw new ConnectionServiceError(
        ConnectionServiceErrorCode.NoteTooLong,
        `Note cannot exceed ${MAX_NOTE_LENGTH} characters`,
      );
    }
  }

  /**
   * Convert a note record to the API response format
   */
  private recordToNote(
    record: ConnectionNoteRecord,
  ): IBaseConnectionNote<string> {
    return {
      _id: record._id,
      userId: record.userId,
      connectionId: record.connectionId,
      note: record.note,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  async addNote(
    userId: string,
    connectionId: string,
    note: string,
  ): Promise<IBaseConnectionNote<string>> {
    this.validateNoteContent(note);

    // Check if a note already exists for this connection (unique constraint)
    const existing = await this.notesCollection
      .findOne({
        userId,
        connectionId,
      } as Partial<ConnectionNoteRecord>)
      .exec();

    if (existing) {
      // Update existing note instead of creating duplicate
      const now = new Date().toISOString();
      await this.notesCollection
        .updateOne(
          { _id: existing._id } as Partial<ConnectionNoteRecord>,
          {
            note: note.trim(),
            updatedAt: now,
          } as Partial<ConnectionNoteRecord>,
        )
        .exec();
      return this.recordToNote({
        ...existing,
        note: note.trim(),
        updatedAt: now,
      });
    }

    const now = new Date().toISOString();
    const record: ConnectionNoteRecord = {
      _id: randomUUID(),
      userId,
      connectionId,
      note: note.trim(),
      createdAt: now,
      updatedAt: now,
    };

    await this.notesCollection.create(record);
    return this.recordToNote(record);
  }

  async updateNote(
    userId: string,
    connectionId: string,
    note: string,
  ): Promise<IBaseConnectionNote<string>> {
    this.validateNoteContent(note);

    const existing = await this.notesCollection
      .findOne({
        userId,
        connectionId,
      } as Partial<ConnectionNoteRecord>)
      .exec();

    if (!existing) {
      throw new ConnectionServiceError(
        ConnectionServiceErrorCode.NoteNotFound,
        'No note found for this connection',
      );
    }

    const now = new Date().toISOString();
    await this.notesCollection
      .updateOne(
        { _id: existing._id } as Partial<ConnectionNoteRecord>,
        {
          note: note.trim(),
          updatedAt: now,
        } as Partial<ConnectionNoteRecord>,
      )
      .exec();

    return this.recordToNote({
      ...existing,
      note: note.trim(),
      updatedAt: now,
    });
  }

  async deleteNote(userId: string, connectionId: string): Promise<void> {
    const result = await this.notesCollection
      .deleteOne({
        userId,
        connectionId,
      } as Partial<ConnectionNoteRecord>)
      .exec();

    if (result.deletedCount === 0) {
      throw new ConnectionServiceError(
        ConnectionServiceErrorCode.NoteNotFound,
        'No note found for this connection',
      );
    }
  }

  async searchConnectionsByNote(
    userId: string,
    searchTerm: string,
    options?: IPaginationOptions,
  ): Promise<IPaginatedResult<IBaseConnectionNote<string>>> {
    const limit = this.getLimit(options);
    const skip = options?.cursor ? parseInt(options.cursor, 10) : 0;

    // Find all notes for this user (we filter in-memory for text matching
    // since the mock collection doesn't support regex/text search)
    const allNotes = await this.notesCollection
      .find({ userId } as Partial<ConnectionNoteRecord>)
      .exec();

    // Filter by search term (case-insensitive)
    const searchLower = searchTerm.toLowerCase();
    const matchingNotes = allNotes.filter((n) =>
      n.note.toLowerCase().includes(searchLower),
    );

    // Apply pagination
    const paginatedNotes = matchingNotes.slice(skip, skip + limit + 1);
    const hasMore = paginatedNotes.length > limit;
    const results = paginatedNotes.slice(0, limit);

    return {
      items: results.map((r) => this.recordToNote(r)),
      cursor: hasMore ? String(skip + limit) : undefined,
      hasMore,
    };
  }

  // ═══════════════════════════════════════════════════════
  // Import/Export Operations (Requirements 22.1-22.7)
  // ═══════════════════════════════════════════════════════

  /**
   * Check and enforce rate limiting for import operations
   * @throws ConnectionServiceError if rate limited
   */
  private checkImportRateLimit(userId: string): void {
    const lastImport = this.lastImportTimestamps.get(userId);
    if (lastImport !== undefined) {
      const elapsed = Date.now() - lastImport;
      if (elapsed < IMPORT_RATE_LIMIT_MS) {
        throw new ConnectionServiceError(
          ConnectionServiceErrorCode.ImportRateLimited,
          `Import rate limited. Please wait ${Math.ceil((IMPORT_RATE_LIMIT_MS - elapsed) / 1000)} seconds before importing again.`,
        );
      }
    }
  }

  /**
   * Parse CSV data into an array of usernames (one per line)
   */
  private parseCsvUsernames(data: string): string[] {
    return data
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith('#'));
  }

  /**
   * Look up a user profile by username
   */
  private async findUserByUsername(
    username: string,
  ): Promise<UserProfileRecord | null> {
    return this.userProfilesCollection
      .findOne({ username } as Partial<UserProfileRecord>)
      .exec();
  }

  async exportConnections(userId: string): Promise<IConnectionExportData> {
    // Get all follows for this user
    const follows = await this.followsCollection
      .find({ followerId: userId } as Partial<FollowRecord>)
      .exec();

    const followedIds = follows.map((f) => f.followedId);

    // Get all category assignments for this user
    const allAssignments = await this.categoryAssignmentsCollection
      .find({ ownerId: userId } as Partial<ConnectionCategoryAssignmentRecord>)
      .exec();

    // Get all categories for this user
    const allCategories = await this.categoriesCollection
      .find({ ownerId: userId } as Partial<ConnectionCategoryRecord>)
      .exec();
    const categoryMap = new Map(allCategories.map((c) => [c._id, c.name]));

    // Get all notes for this user
    const allNotes = await this.notesCollection
      .find({ userId } as Partial<ConnectionNoteRecord>)
      .exec();
    const noteMap = new Map(allNotes.map((n) => [n.connectionId, n.note]));

    // Get all list memberships for lists owned by this user
    const userLists = await this.listsCollection
      .find({ ownerId: userId } as Partial<ConnectionListRecord>)
      .exec();
    const listNameMap = new Map(userLists.map((l) => [l._id, l.name]));

    // Build a map of connectionId -> list names
    const connectionListNames = new Map<string, string[]>();
    for (const list of userLists) {
      const members = await this.listMembersCollection
        .find({ listId: list._id } as Partial<ConnectionListMemberRecord>)
        .exec();
      for (const member of members) {
        const existing = connectionListNames.get(member.userId) || [];
        const listName = listNameMap.get(list._id);
        if (listName) {
          existing.push(listName);
        }
        connectionListNames.set(member.userId, existing);
      }
    }

    // Build connection entries
    const connections = [];
    for (const followedId of followedIds) {
      const profile = await this.userProfilesCollection
        .findOne({ _id: followedId } as Partial<UserProfileRecord>)
        .exec();
      if (!profile) continue;

      // Get categories for this connection
      const assignments = allAssignments.filter(
        (a) => a.connectionId === followedId,
      );
      const categories = assignments
        .map((a) => categoryMap.get(a.categoryId))
        .filter((name): name is string => name !== undefined);

      connections.push({
        username: profile.username,
        displayName: profile.displayName,
        categories,
        note: noteMap.get(followedId),
        lists: connectionListNames.get(followedId) || [],
      });
    }

    return {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      userId,
      connectionCount: connections.length,
      connections,
    };
  }

  async exportList(listId: string, ownerId: string): Promise<IListExportData> {
    const list = await this.getOwnedList(listId, ownerId);

    // Get all members
    const memberRecords = await this.listMembersCollection
      .find({ listId } as Partial<ConnectionListMemberRecord>)
      .exec();

    const members = [];
    for (const memberRecord of memberRecords) {
      const profile = await this.userProfilesCollection
        .findOne({ _id: memberRecord.userId } as Partial<UserProfileRecord>)
        .exec();
      if (profile) {
        members.push({
          username: profile.username,
          displayName: profile.displayName,
        });
      }
    }

    return {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      listName: list.name,
      description: list.description,
      visibility: list.visibility,
      memberCount: members.length,
      members,
    };
  }

  async importConnections(
    userId: string,
    data: string,
    format: 'json' | 'csv',
  ): Promise<IImportResult> {
    this.checkImportRateLimit(userId);

    let usernames: string[];

    if (format === 'csv') {
      usernames = this.parseCsvUsernames(data);
    } else {
      try {
        const parsed = JSON.parse(data);
        if (parsed.connections && Array.isArray(parsed.connections)) {
          usernames = parsed.connections
            .map((c: { username?: string }) => c.username || '')
            .filter((u: string) => u.length > 0);
        } else if (parsed.usernames && Array.isArray(parsed.usernames)) {
          usernames = parsed.usernames.filter(
            (u: unknown) => typeof u === 'string' && u.length > 0,
          );
        } else if (Array.isArray(parsed)) {
          usernames = parsed
            .map((entry: string | { username?: string }) =>
              typeof entry === 'string' ? entry : entry.username || '',
            )
            .filter((u: string) => u.length > 0);
        } else {
          throw new Error('Unrecognized JSON structure');
        }
      } catch {
        throw new ConnectionServiceError(
          ConnectionServiceErrorCode.InvalidImportFormat,
          'Invalid JSON format. Expected { connections: [{ username }] } or an array of usernames.',
        );
      }
    }

    // Deduplicate
    const uniqueUsernames = [...new Set(usernames)];

    const result: IImportResult = {
      successCount: 0,
      skippedCount: 0,
      totalCount: uniqueUsernames.length,
      skippedUsernames: [],
      errors: [],
    };

    for (const username of uniqueUsernames) {
      const profile = await this.findUserByUsername(username);
      if (!profile) {
        result.skippedCount++;
        result.skippedUsernames.push(username);
        continue;
      }

      // Don't follow yourself
      if (profile._id === userId) {
        result.skippedCount++;
        result.errors.push(`Cannot follow yourself (${username})`);
        continue;
      }

      // Skip blocked users (Requirement 32.5)
      const isBlocked = await this.isBlockedFromList(profile._id, userId);
      const isBlockedBy = await this.blocksCollection
        .findOne({
          blockerId: profile._id,
          blockedId: userId,
        } as Partial<BlockRecord>)
        .exec();
      if (isBlocked || isBlockedBy) {
        result.skippedCount++;
        result.errors.push(`Skipped blocked user: ${username}`);
        continue;
      }

      // Check if already following
      const existingFollow = await this.followsCollection
        .findOne({
          followerId: userId,
          followedId: profile._id,
        } as Partial<FollowRecord>)
        .exec();

      if (existingFollow) {
        // Already following, count as success (idempotent)
        result.successCount++;
        continue;
      }

      // Create follow relationship
      await this.followsCollection.create({
        _id: randomUUID(),
        followerId: userId,
        followedId: profile._id,
        createdAt: new Date().toISOString(),
      });
      result.successCount++;
    }

    // Record import timestamp for rate limiting
    this.lastImportTimestamps.set(userId, Date.now());

    return result;
  }

  async importList(
    userId: string,
    data: string,
    format: 'json' | 'csv',
  ): Promise<IImportResult> {
    this.checkImportRateLimit(userId);

    let listName: string;
    let description: string | undefined;
    let visibility: ConnectionVisibility = ConnectionVisibility.Private;
    let usernames: string[];

    if (format === 'csv') {
      // CSV: first line is list name, rest are usernames
      const lines = data
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && !line.startsWith('#'));

      if (lines.length === 0) {
        throw new ConnectionServiceError(
          ConnectionServiceErrorCode.InvalidImportFormat,
          'CSV data is empty. Expected at least a list name on the first line.',
        );
      }

      listName = lines[0];
      usernames = lines.slice(1);
    } else {
      try {
        const parsed = JSON.parse(data);
        listName = parsed.listName || parsed.name;
        if (!listName || typeof listName !== 'string') {
          throw new Error('Missing list name');
        }
        description = parsed.description;
        if (
          parsed.visibility &&
          Object.values(ConnectionVisibility).includes(parsed.visibility)
        ) {
          visibility = parsed.visibility as ConnectionVisibility;
        }
        if (parsed.members && Array.isArray(parsed.members)) {
          usernames = parsed.members
            .map((m: string | { username?: string }) =>
              typeof m === 'string' ? m : m.username || '',
            )
            .filter((u: string) => u.length > 0);
        } else {
          usernames = [];
        }
      } catch {
        throw new ConnectionServiceError(
          ConnectionServiceErrorCode.InvalidImportFormat,
          'Invalid JSON format. Expected { listName, members: [{ username }] }.',
        );
      }
    }

    // Create the list
    const list = await this.createList(userId, listName, {
      description,
      visibility,
    });

    // Deduplicate
    const uniqueUsernames = [...new Set(usernames)];

    const result: IImportResult = {
      successCount: 0,
      skippedCount: 0,
      totalCount: uniqueUsernames.length,
      skippedUsernames: [],
      errors: [],
    };

    const validUserIds: string[] = [];

    for (const username of uniqueUsernames) {
      const profile = await this.findUserByUsername(username);
      if (!profile) {
        result.skippedCount++;
        result.skippedUsernames.push(username);
        continue;
      }

      // Skip blocked users during list import (Requirement 32.5)
      const isBlocked = await this.isBlockedFromList(profile._id, userId);
      if (isBlocked) {
        result.skippedCount++;
        result.errors.push(`Skipped blocked user: ${username}`);
        continue;
      }

      // Check if this user is a connection (followed by the importer)
      const existingFollow = await this.followsCollection
        .findOne({
          followerId: userId,
          followedId: profile._id,
        } as Partial<FollowRecord>)
        .exec();

      if (!existingFollow) {
        result.skippedCount++;
        result.errors.push(
          `${username} is not a connection; only existing connections can be added to lists`,
        );
        continue;
      }

      validUserIds.push(profile._id);
      result.successCount++;
    }

    // Add valid users to the list in bulk
    if (validUserIds.length > 0) {
      await this.addMembersToList(list._id, userId, validUserIds);
    }

    // Record import timestamp for rate limiting
    this.lastImportTimestamps.set(userId, Date.now());

    return result;
  }

  // ═══════════════════════════════════════════════════════
  // Priority Connection Operations (Requirements 23.1-23.5)
  // ═══════════════════════════════════════════════════════

  async setPriority(
    userId: string,
    connectionId: string,
    isPriority: boolean,
  ): Promise<void> {
    // If setting priority=true, enforce the 50 limit
    if (isPriority) {
      const allMetadata = await this.metadataCollection
        .find({ userId, isPriority: true } as Partial<ConnectionMetadataRecord>)
        .exec();

      // Check if this connection is already priority (don't count it against the limit)
      const existingForConnection = allMetadata.find(
        (m) => m.connectionId === connectionId,
      );
      const currentPriorityCount = allMetadata.length;

      if (
        !existingForConnection?.isPriority &&
        currentPriorityCount >= MAX_PRIORITY_CONNECTIONS
      ) {
        throw new ConnectionServiceError(
          ConnectionServiceErrorCode.PriorityLimitExceeded,
          `Cannot have more than ${MAX_PRIORITY_CONNECTIONS} priority connections`,
        );
      }
    }

    // Check if metadata record already exists for this user+connection
    const existing = await this.metadataCollection
      .findOne({
        userId,
        connectionId,
      } as Partial<ConnectionMetadataRecord>)
      .exec();

    const now = new Date().toISOString();

    if (existing) {
      // Update existing record
      await this.metadataCollection
        .updateOne(
          { _id: existing._id } as Partial<ConnectionMetadataRecord>,
          {
            isPriority,
            updatedAt: now,
          } as Partial<ConnectionMetadataRecord>,
        )
        .exec();
    } else {
      // Create new metadata record (upsert)
      await this.metadataCollection.create({
        _id: randomUUID(),
        userId,
        connectionId,
        isPriority,
        isQuiet: false,
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  async getPriorityConnections(
    userId: string,
    options?: IPaginationOptions,
  ): Promise<IPaginatedResult<IBaseUserProfile<string>>> {
    const limit = this.getLimit(options);
    const queryLimit = limit + 1;

    // Get all priority metadata records for this user
    let query = this.metadataCollection.find({
      userId,
      isPriority: true,
    } as Partial<ConnectionMetadataRecord>);

    if (query.sort) {
      query = query.sort({ updatedAt: -1 });
    }

    const allRecords = await query.exec();
    let filteredRecords = allRecords;

    if (options?.cursor) {
      filteredRecords = allRecords.filter((r) => r.updatedAt < options.cursor!);
    }

    const paginatedRecords = filteredRecords.slice(0, queryLimit);
    const hasMore = paginatedRecords.length > limit;
    const resultRecords = hasMore
      ? paginatedRecords.slice(0, limit)
      : paginatedRecords;

    // Look up user profiles for each priority connection
    const profiles: IBaseUserProfile<string>[] = [];
    for (const record of resultRecords) {
      const userRecord = await this.userProfilesCollection
        .findOne({
          _id: record.connectionId,
        } as Partial<UserProfileRecord>)
        .exec();

      if (userRecord) {
        profiles.push(this.recordToProfile(userRecord));
      }
    }

    const lastRecord = resultRecords[resultRecords.length - 1];
    return {
      items: profiles,
      cursor: hasMore && lastRecord ? lastRecord.updatedAt : undefined,
      hasMore,
    };
  }

  async setQuietMode(
    userId: string,
    connectionId: string,
    isQuiet: boolean,
  ): Promise<void> {
    // Check if metadata record already exists for this user+connection
    const existing = await this.metadataCollection
      .findOne({
        userId,
        connectionId,
      } as Partial<ConnectionMetadataRecord>)
      .exec();

    const now = new Date().toISOString();

    if (existing) {
      // Update existing record
      await this.metadataCollection
        .updateOne(
          { _id: existing._id } as Partial<ConnectionMetadataRecord>,
          {
            isQuiet,
            updatedAt: now,
          } as Partial<ConnectionMetadataRecord>,
        )
        .exec();
    } else {
      // Create new metadata record (upsert)
      await this.metadataCollection.create({
        _id: randomUUID(),
        userId,
        connectionId,
        isPriority: false,
        isQuiet,
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  async getQuietConnections(
    userId: string,
    options?: IPaginationOptions,
  ): Promise<IPaginatedResult<IBaseUserProfile<string>>> {
    const limit = this.getLimit(options);
    const queryLimit = limit + 1;

    // Get all quiet metadata records for this user
    let query = this.metadataCollection.find({
      userId,
      isQuiet: true,
    } as Partial<ConnectionMetadataRecord>);

    if (query.sort) {
      query = query.sort({ updatedAt: -1 });
    }

    const allRecords = await query.exec();
    let filteredRecords = allRecords;

    if (options?.cursor) {
      filteredRecords = allRecords.filter((r) => r.updatedAt < options.cursor!);
    }

    const paginatedRecords = filteredRecords.slice(0, queryLimit);
    const hasMore = paginatedRecords.length > limit;
    const resultRecords = hasMore
      ? paginatedRecords.slice(0, limit)
      : paginatedRecords;

    // Look up user profiles for each quiet connection
    const profiles: IBaseUserProfile<string>[] = [];
    for (const record of resultRecords) {
      const userRecord = await this.userProfilesCollection
        .findOne({
          _id: record.connectionId,
        } as Partial<UserProfileRecord>)
        .exec();

      if (userRecord) {
        profiles.push(this.recordToProfile(userRecord));
      }
    }

    const lastRecord = resultRecords[resultRecords.length - 1];
    return {
      items: profiles,
      cursor: hasMore && lastRecord ? lastRecord.updatedAt : undefined,
      hasMore,
    };
  }

  /**
   * Calculate the expiration date for a mute duration.
   * @param duration The mute duration
   * @returns ISO string of the expiration date
   */
  private calculateExpiresAt(duration: MuteDuration): string {
    const durationToMs: Record<string, number> = {
      '1h': 3600000,
      '8h': 28800000,
      '24h': 86400000,
      '7d': 604800000,
      '30d': 2592000000,
      // ~100 years for permanent mutes
      permanent: 100 * 365.25 * 24 * 60 * 60 * 1000,
    };

    const ms = durationToMs[duration];
    return new Date(Date.now() + ms).toISOString();
  }

  /**
   * Set a temporary mute on a connection with a specified duration.
   * Creates or updates a mute record with a calculated expiration timestamp.
   * @see Requirements: 25.1, 25.2
   */
  async setTemporaryMute(
    userId: string,
    connectionId: string,
    duration: MuteDuration,
  ): Promise<void> {
    const now = new Date().toISOString();
    const expiresAt = this.calculateExpiresAt(duration);

    // Check if a mute already exists for this user+connection
    const existing = await this.temporaryMutesCollection
      .findOne({
        userId,
        connectionId,
      } as Partial<TemporaryMuteRecord>)
      .exec();

    if (existing) {
      // Update existing mute with new duration and expiration
      await this.temporaryMutesCollection
        .updateOne(
          { _id: existing._id } as Partial<TemporaryMuteRecord>,
          {
            duration,
            expiresAt,
            createdAt: now,
          } as Partial<TemporaryMuteRecord>,
        )
        .exec();
    } else {
      // Create new mute record
      await this.temporaryMutesCollection.create({
        _id: randomUUID(),
        userId,
        connectionId,
        duration,
        expiresAt,
        createdAt: now,
      });
    }
  }

  /**
   * Remove a temporary mute before it expires (early unmute).
   * @see Requirements: 25.7
   */
  async removeTemporaryMute(
    userId: string,
    connectionId: string,
  ): Promise<void> {
    await this.temporaryMutesCollection
      .deleteOne({
        userId,
        connectionId,
      } as Partial<TemporaryMuteRecord>)
      .exec();
  }

  /**
   * Convert a temporary mute to a permanent mute.
   * @see Requirements: 25.6
   */
  async convertToPermanentMute(
    userId: string,
    connectionId: string,
  ): Promise<void> {
    const existing = await this.temporaryMutesCollection
      .findOne({
        userId,
        connectionId,
      } as Partial<TemporaryMuteRecord>)
      .exec();

    if (!existing) {
      // No existing mute — create a permanent one
      await this.setTemporaryMute(userId, connectionId, MuteDuration.Permanent);
      return;
    }

    const permanentExpiresAt = this.calculateExpiresAt(MuteDuration.Permanent);

    await this.temporaryMutesCollection
      .updateOne(
        { _id: existing._id } as Partial<TemporaryMuteRecord>,
        {
          duration: MuteDuration.Permanent,
          expiresAt: permanentExpiresAt,
        } as Partial<TemporaryMuteRecord>,
      )
      .exec();
  }

  /**
   * Get all muted connections for a user with their expiration info.
   * Only returns currently active (non-expired) mutes.
   * @see Requirements: 25.5
   */
  async getMutedConnections(
    userId: string,
    options?: IPaginationOptions,
  ): Promise<
    IPaginatedResult<
      IBaseUserProfile<string> & { expiresAt: string; duration: string }
    >
  > {
    const limit = this.getLimit(options);
    const queryLimit = limit + 1;
    const now = new Date().toISOString();

    // Get all mute records for this user
    let query = this.temporaryMutesCollection.find({
      userId,
    } as Partial<TemporaryMuteRecord>);

    if (query.sort) {
      query = query.sort({ expiresAt: 1 });
    }

    const allRecords = await query.exec();

    // Filter to only active (non-expired) mutes
    let filteredRecords = allRecords.filter((r) => r.expiresAt > now);

    // Apply cursor-based pagination
    if (options?.cursor) {
      filteredRecords = filteredRecords.filter(
        (r) => r.expiresAt > options.cursor!,
      );
    }

    const paginatedRecords = filteredRecords.slice(0, queryLimit);
    const hasMore = paginatedRecords.length > limit;
    const resultRecords = hasMore
      ? paginatedRecords.slice(0, limit)
      : paginatedRecords;

    // Look up user profiles and attach mute info
    const results: (IBaseUserProfile<string> & {
      expiresAt: string;
      duration: string;
    })[] = [];

    for (const record of resultRecords) {
      const userRecord = await this.userProfilesCollection
        .findOne({
          _id: record.connectionId,
        } as Partial<UserProfileRecord>)
        .exec();

      if (userRecord) {
        results.push({
          ...this.recordToProfile(userRecord),
          expiresAt: record.expiresAt,
          duration: record.duration,
        });
      }
    }

    const lastRecord = resultRecords[resultRecords.length - 1];
    return {
      items: results,
      cursor: hasMore && lastRecord ? lastRecord.expiresAt : undefined,
      hasMore,
    };
  }

  // ═══════════════════════════════════════════════════════
  // Hub Operations (Requirements 30.1-30.10)
  // ═══════════════════════════════════════════════════════

  /**
   * Convert a hub database record to the API response format
   */
  private recordToHub(record: HubRecord): IBaseHub<string> {
    return {
      _id: record._id,
      ownerId: record.ownerId,
      slug: record.slug,
      name: record.name,
      description: record.description,
      rules: record.rules,
      memberCount: record.memberCount,
      postCount: record.postCount ?? 0,
      isDefault: record.isDefault,
      trustTier: record.trustTier as IBaseHub<string>['trustTier'],
      parentHubId: record.parentHubId,
      icon: record.icon,
      moderatorIds: record.moderatorIds,
      createdAt: record.createdAt,
    };
  }

  /**
   * Validate hub name
   */
  private validateHubName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new ConnectionServiceError(
        ConnectionServiceErrorCode.InvalidHubName,
        'Hub name cannot be empty',
      );
    }
    if (name.trim().length > 50) {
      throw new ConnectionServiceError(
        ConnectionServiceErrorCode.InvalidHubName,
        'Hub name cannot exceed 50 characters',
      );
    }
  }

  /**
   * Get an owned hub or throw
   */
  private async getOwnedHub(
    hubId: string,
    ownerId: string,
  ): Promise<HubRecord> {
    const hub = await this.hubsCollection
      .findOne({ _id: hubId } as Partial<HubRecord>)
      .exec();

    if (!hub) {
      throw new ConnectionServiceError(
        ConnectionServiceErrorCode.HubNotFound,
        `Hub ${hubId} not found`,
      );
    }

    if (hub.ownerId !== ownerId) {
      throw new ConnectionServiceError(
        ConnectionServiceErrorCode.HubNotAuthorized,
        'Not authorized to modify this hub',
      );
    }

    return hub;
  }

  /**
   * Create a new hub (community space)
   * @see Requirements: 30.1, 30.9
   */
  async createHub(
    ownerId: string,
    name: string,
    options?: {
      slug?: string;
      description?: string;
      rules?: string;
      trustTier?: string;
      parentHubId?: string;
      icon?: string;
    },
  ): Promise<IBaseHub<string>> {
    this.validateHubName(name);

    // Validate slug uniqueness if provided
    if (options?.slug) {
      const existingSlug = await this.hubsCollection
        .findOne({ slug: options.slug } as Partial<HubRecord>)
        .exec();
      if (existingSlug) {
        throw new ConnectionServiceError(
          ConnectionServiceErrorCode.InvalidHubName,
          `Hub slug "${options.slug}" is already taken`,
        );
      }
    }

    // Validate parent hub exists if provided
    if (options?.parentHubId) {
      const parent = await this.hubsCollection
        .findOne({ _id: options.parentHubId } as Partial<HubRecord>)
        .exec();
      if (!parent) {
        throw new ConnectionServiceError(
          ConnectionServiceErrorCode.HubNotFound,
          'Parent hub not found',
        );
      }
      // Prevent nesting deeper than one level
      if (parent.parentHubId) {
        throw new ConnectionServiceError(
          ConnectionServiceErrorCode.InvalidHubName,
          'Sub-hubs cannot be nested more than one level deep',
        );
      }
    }

    const now = new Date().toISOString();
    const record: HubRecord = {
      _id: randomUUID(),
      ownerId,
      slug: options?.slug || undefined,
      name: name.trim(),
      description: options?.description?.trim() || undefined,
      rules: options?.rules?.trim() || undefined,
      memberCount: 1, // Owner is automatically a member
      postCount: 0,
      isDefault: false,
      trustTier: options?.trustTier || 'open',
      parentHubId: options?.parentHubId || undefined,
      icon: options?.icon || undefined,
      moderatorIds: [ownerId], // Owner is automatically a moderator
      createdAt: now,
    };

    const created = await this.hubsCollection.create(record);

    // Auto-add owner as member
    await this.hubMembersCollection.create({
      _id: randomUUID(),
      hubId: created._id,
      userId: ownerId,
      addedAt: now,
    });

    return this.recordToHub(created);
  }

  /**
   * Delete a hub and all its memberships.
   * Cannot delete the default "Close Friends" hub.
   * @see Requirements: 30.1
   */
  async deleteHub(hubId: string, ownerId: string): Promise<void> {
    const hub = await this.getOwnedHub(hubId, ownerId);

    if (hub.isDefault) {
      throw new ConnectionServiceError(
        ConnectionServiceErrorCode.CannotDeleteDefaultHub,
        'Cannot delete the default hub',
      );
    }

    // Delete all memberships
    const members = await this.hubMembersCollection
      .find({ hubId } as Partial<HubMemberRecord>)
      .exec();

    for (const member of members) {
      await this.hubMembersCollection
        .deleteOne({ _id: member._id } as Partial<HubMemberRecord>)
        .exec();
    }

    // Delete the hub
    await this.hubsCollection
      .deleteOne({ _id: hubId } as Partial<HubRecord>)
      .exec();
  }

  /**
   * Add members to a hub (bulk support)
   * @see Requirements: 30.2, 30.10
   */
  async addToHub(
    hubId: string,
    ownerId: string,
    userIds: string[],
  ): Promise<void> {
    const hub = await this.getOwnedHub(hubId, ownerId);

    if (hub.memberCount + userIds.length > MAX_MEMBERS_PER_HUB) {
      throw new ConnectionServiceError(
        ConnectionServiceErrorCode.HubMemberLimitExceeded,
        `Cannot exceed ${MAX_MEMBERS_PER_HUB} members per hub`,
      );
    }

    const now = new Date().toISOString();
    let addedCount = 0;

    for (const userId of userIds) {
      // Check if already a member
      const existing = await this.hubMembersCollection
        .findOne({
          hubId,
          userId,
        } as Partial<HubMemberRecord>)
        .exec();

      if (existing) {
        // Skip duplicates silently for bulk operations
        continue;
      }

      await this.hubMembersCollection.create({
        _id: randomUUID(),
        hubId,
        userId,
        addedAt: now,
      });
      addedCount++;
    }

    // Update member count
    if (addedCount > 0) {
      await this.hubsCollection
        .updateOne(
          { _id: hubId } as Partial<HubRecord>,
          {
            memberCount: hub.memberCount + addedCount,
          } as Partial<HubRecord>,
        )
        .exec();
    }
  }

  /**
   * Remove members from a hub (bulk support)
   * @see Requirements: 30.2
   */
  async removeFromHub(
    hubId: string,
    ownerId: string,
    userIds: string[],
  ): Promise<void> {
    const hub = await this.getOwnedHub(hubId, ownerId);

    let removedCount = 0;

    for (const userId of userIds) {
      const result = await this.hubMembersCollection
        .deleteOne({
          hubId,
          userId,
        } as Partial<HubMemberRecord>)
        .exec();

      if (result.deletedCount > 0) {
        removedCount++;
      }
    }

    // Update member count
    if (removedCount > 0) {
      const newCount = Math.max(0, hub.memberCount - removedCount);
      await this.hubsCollection
        .updateOne(
          { _id: hubId } as Partial<HubRecord>,
          { memberCount: newCount } as Partial<HubRecord>,
        )
        .exec();
    }
  }

  /**
   * Get all hubs owned by a user
   * @see Requirements: 30.1
   */
  async getHubs(ownerId: string): Promise<IBaseHub<string>[]> {
    const records = await this.hubsCollection
      .find({ ownerId } as Partial<HubRecord>)
      .exec();

    return records.map((r) => this.recordToHub(r));
  }

  /**
   * Get members of a hub with pagination
   * @see Requirements: 30.2
   */
  async getHubMembers(
    hubId: string,
    options?: IPaginationOptions,
  ): Promise<IPaginatedResult<IBaseUserProfile<string>>> {
    const limit = this.getLimit(options);

    let query = this.hubMembersCollection.find({
      hubId,
    } as Partial<HubMemberRecord>);

    if (options?.cursor && query.sort) {
      // Use cursor-based pagination by filtering addedAt
      query = this.hubMembersCollection.find({
        hubId,
      } as Partial<HubMemberRecord>);
    }

    if (query.sort) {
      query = query.sort({ addedAt: -1 });
    }
    if (query.skip && options?.cursor) {
      // Simple offset approach: count records before cursor
    }
    if (query.limit) {
      query = query.limit(limit + 1);
    }

    const memberRecords = await query.exec();

    // Filter by cursor if provided
    const filteredRecords = options?.cursor
      ? memberRecords.filter((r) => r.addedAt < options.cursor!)
      : memberRecords;

    const hasMore = filteredRecords.length > limit;
    const resultRecords = hasMore
      ? filteredRecords.slice(0, limit)
      : filteredRecords;

    // Look up user profiles
    const results: IBaseUserProfile<string>[] = [];
    for (const record of resultRecords) {
      const userRecord = await this.userProfilesCollection
        .findOne({ _id: record.userId } as Partial<UserProfileRecord>)
        .exec();

      if (userRecord) {
        results.push(this.recordToProfile(userRecord));
      }
    }

    const lastRecord = resultRecords[resultRecords.length - 1];
    return {
      items: results,
      cursor: hasMore && lastRecord ? lastRecord.addedAt : undefined,
      hasMore,
    };
  }

  /**
   * Get or create the default "Close Friends" hub for a user
   * @see Requirements: 30.6
   */
  async getOrCreateDefaultHub(ownerId: string): Promise<IBaseHub<string>> {
    // Try to find existing default hub
    const existing = await this.hubsCollection
      .findOne({
        ownerId,
        isDefault: true,
      } as Partial<HubRecord>)
      .exec();

    if (existing) {
      return this.recordToHub(existing);
    }

    // Create the default hub
    const now = new Date().toISOString();
    const record: HubRecord = {
      _id: randomUUID(),
      ownerId,
      name: DEFAULT_HUB_NAME,
      memberCount: 0,
      postCount: 0,
      isDefault: true,
      createdAt: now,
    };

    const created = await this.hubsCollection.create(record);
    return this.recordToHub(created);
  }

  /**
   * Get a hub by its slug
   */
  async getHubBySlug(slug: string): Promise<IBaseHub<string> | null> {
    const record = await this.hubsCollection
      .findOne({ slug } as Partial<HubRecord>)
      .exec();
    return record ? this.recordToHub(record) : null;
  }

  /**
   * Get a hub by ID or slug
   */
  async getHubByIdOrSlug(idOrSlug: string): Promise<IBaseHub<string> | null> {
    // Try by slug first
    let record = await this.hubsCollection
      .findOne({ slug: idOrSlug } as Partial<HubRecord>)
      .exec();
    if (!record) {
      // Fall back to ID
      record = await this.hubsCollection
        .findOne({ _id: idOrSlug } as Partial<HubRecord>)
        .exec();
    }
    return record ? this.recordToHub(record) : null;
  }

  /**
   * Explore public hubs with optional search and sorting
   */
  async exploreHubs(options?: {
    sort?: 'trending' | 'new' | 'suggested';
    query?: string;
    limit?: number;
    userId?: string;
  }): Promise<IBaseHub<string>[]> {
    const limit = options?.limit ?? 20;

    // Get all non-default hubs (community hubs)
    const allHubs = await this.hubsCollection
      .find({ isDefault: false } as Partial<HubRecord>)
      .exec();

    let filtered = allHubs;

    // Text search filter
    if (options?.query) {
      const q = options.query.toLowerCase();
      filtered = filtered.filter(
        (h) =>
          h.name.toLowerCase().includes(q) ||
          (h.description && h.description.toLowerCase().includes(q)) ||
          (h.slug && h.slug.toLowerCase().includes(q)),
      );
    }

    // Sort
    if (options?.sort === 'new') {
      filtered.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    } else {
      // trending / default: sort by member count descending
      filtered.sort((a, b) => b.memberCount - a.memberCount);
    }

    return filtered.slice(0, limit).map((r) => this.recordToHub(r));
  }

  /**
   * Self-service join a hub (any user can join open hubs)
   */
  async joinHub(hubId: string, userId: string): Promise<void> {
    const hub = await this.hubsCollection
      .findOne({ _id: hubId } as Partial<HubRecord>)
      .exec();

    if (!hub) {
      throw new ConnectionServiceError(
        ConnectionServiceErrorCode.HubNotFound,
        `Hub ${hubId} not found`,
      );
    }

    // Check if user is banned (permanent or active temp ban)
    const bans = await this.hubBannedUsersCollection
      .find({ hubId, userId } as Partial<HubBannedUserRecord>)
      .exec();
    const activeBan = bans.find((b) => {
      if (b.severity === 'warning') return false; // Warnings don't prevent joining
      if (b.severity === 'permanent_ban') return true;
      if (b.severity === 'temp_ban' && b.expiresAt) {
        return new Date(b.expiresAt).getTime() > Date.now();
      }
      return false;
    });
    if (activeBan) {
      throw new ConnectionServiceError(
        ConnectionServiceErrorCode.HubNotAuthorized,
        'You are banned from this hub',
      );
    }

    // Check if already a member
    const existing = await this.hubMembersCollection
      .findOne({ hubId, userId } as Partial<HubMemberRecord>)
      .exec();

    if (existing) {
      throw new ConnectionServiceError(
        ConnectionServiceErrorCode.AlreadyHubMember,
        'Already a member of this hub',
      );
    }

    const now = new Date().toISOString();
    await this.hubMembersCollection.create({
      _id: randomUUID(),
      hubId,
      userId,
      addedAt: now,
    });

    await this.hubsCollection
      .updateOne(
        { _id: hubId } as Partial<HubRecord>,
        { memberCount: hub.memberCount + 1 } as Partial<HubRecord>,
      )
      .exec();
  }

  /**
   * Self-service leave a hub
   */
  async leaveHub(hubId: string, userId: string): Promise<void> {
    const hub = await this.hubsCollection
      .findOne({ _id: hubId } as Partial<HubRecord>)
      .exec();

    if (!hub) {
      throw new ConnectionServiceError(
        ConnectionServiceErrorCode.HubNotFound,
        `Hub ${hubId} not found`,
      );
    }

    // Cannot leave if you're the owner
    if (hub.ownerId === userId) {
      throw new ConnectionServiceError(
        ConnectionServiceErrorCode.HubNotAuthorized,
        'Hub owner cannot leave. Transfer ownership or delete the hub.',
      );
    }

    const result = await this.hubMembersCollection
      .deleteOne({ hubId, userId } as Partial<HubMemberRecord>)
      .exec();

    if (result.deletedCount > 0) {
      const newCount = Math.max(0, hub.memberCount - 1);
      await this.hubsCollection
        .updateOne(
          { _id: hubId } as Partial<HubRecord>,
          { memberCount: newCount } as Partial<HubRecord>,
        )
        .exec();

      // Remove from moderators if they were one
      if (hub.moderatorIds?.includes(userId)) {
        const newMods = hub.moderatorIds.filter((id) => id !== userId);
        await this.hubsCollection
          .updateOne(
            { _id: hubId } as Partial<HubRecord>,
            { moderatorIds: newMods } as Partial<HubRecord>,
          )
          .exec();
      }
    }
  }

  /**
   * Update hub settings (owner or moderator only)
   */
  async updateHub(
    hubId: string,
    userId: string,
    updates: {
      name?: string;
      description?: string;
      rules?: string;
      trustTier?: string;
      icon?: string;
    },
  ): Promise<IBaseHub<string>> {
    const hub = await this.hubsCollection
      .findOne({ _id: hubId } as Partial<HubRecord>)
      .exec();

    if (!hub) {
      throw new ConnectionServiceError(
        ConnectionServiceErrorCode.HubNotFound,
        `Hub ${hubId} not found`,
      );
    }

    const isMod = hub.moderatorIds?.includes(userId);
    if (hub.ownerId !== userId && !isMod) {
      throw new ConnectionServiceError(
        ConnectionServiceErrorCode.HubNotAuthorized,
        'Not authorized to modify this hub',
      );
    }

    if (updates.name) this.validateHubName(updates.name);

    const patch: Partial<HubRecord> = {};
    if (updates.name !== undefined) patch.name = updates.name.trim();
    if (updates.description !== undefined)
      patch.description = updates.description.trim();
    if (updates.rules !== undefined) patch.rules = updates.rules.trim();
    if (updates.trustTier !== undefined) patch.trustTier = updates.trustTier;
    if (updates.icon !== undefined) patch.icon = updates.icon;

    await this.hubsCollection
      .updateOne({ _id: hubId } as Partial<HubRecord>, patch)
      .exec();

    const updated = await this.hubsCollection
      .findOne({ _id: hubId } as Partial<HubRecord>)
      .exec();

    return this.recordToHub(updated!);
  }

  /**
   * Add a moderator to a hub (owner only)
   */
  async addModerator(
    hubId: string,
    ownerId: string,
    userId: string,
  ): Promise<void> {
    const hub = await this.getOwnedHub(hubId, ownerId);
    const mods = hub.moderatorIds ?? [];
    if (!mods.includes(userId)) {
      mods.push(userId);
      await this.hubsCollection
        .updateOne(
          { _id: hubId } as Partial<HubRecord>,
          { moderatorIds: mods } as Partial<HubRecord>,
        )
        .exec();
    }
  }

  /**
   * Remove a moderator from a hub (owner only)
   */
  async removeModerator(
    hubId: string,
    ownerId: string,
    userId: string,
  ): Promise<void> {
    const hub = await this.getOwnedHub(hubId, ownerId);
    const mods = (hub.moderatorIds ?? []).filter((id) => id !== userId);
    await this.hubsCollection
      .updateOne(
        { _id: hubId } as Partial<HubRecord>,
        { moderatorIds: mods } as Partial<HubRecord>,
      )
      .exec();
  }

  /**
   * Check if a user is a member of a hub
   */
  async isHubMember(hubId: string, userId: string): Promise<boolean> {
    const record = await this.hubMembersCollection
      .findOne({ hubId, userId } as Partial<HubMemberRecord>)
      .exec();
    return !!record;
  }

  /**
   * Get all hubs a user is a member of (not just owned)
   */
  async getUserSubscribedHubs(
    userId: string,
  ): Promise<IBaseHub<string>[]> {
    const memberships = await this.hubMembersCollection
      .find({ userId } as Partial<HubMemberRecord>)
      .exec();

    const hubs: IBaseHub<string>[] = [];
    for (const m of memberships) {
      const hub = await this.hubsCollection
        .findOne({ _id: m.hubId } as Partial<HubRecord>)
        .exec();
      if (hub && !hub.isDefault) {
        hubs.push(this.recordToHub(hub));
      }
    }
    return hubs;
  }

  /**
   * Get sub-hubs of a parent hub
   */
  async getSubHubs(parentHubId: string): Promise<IBaseHub<string>[]> {
    const records = await this.hubsCollection
      .find({ parentHubId } as Partial<HubRecord>)
      .exec();
    return records.map((r) => this.recordToHub(r));
  }

  /**
   * Remove a post from a hub (moderator action).
   * Strips the hub's ID from the post's hubIds array.
   */
  async removePostFromHub(
    hubId: string,
    _postId: string,
    moderatorId: string,
  ): Promise<void> {
    const hub = await this.hubsCollection
      .findOne({ _id: hubId } as Partial<HubRecord>)
      .exec();
    if (!hub) {
      throw new ConnectionServiceError(
        ConnectionServiceErrorCode.HubNotFound,
        `Hub ${hubId} not found`,
      );
    }

    const isMod =
      hub.ownerId === moderatorId ||
      (hub.moderatorIds ?? []).includes(moderatorId);
    if (!isMod) {
      throw new ConnectionServiceError(
        ConnectionServiceErrorCode.HubNotAuthorized,
        'Not authorized to moderate this hub',
      );
    }

    // Authorization passed — the controller will handle the actual post update
    // since it has access to the post service. This method validates permissions only.
  }

  /**
   * Ban a user from a hub (moderator action).
   * Removes them from membership and prevents re-joining.
   */
  async banFromHub(
    hubId: string,
    userId: string,
    moderatorId: string,
  ): Promise<void> {
    const hub = await this.hubsCollection
      .findOne({ _id: hubId } as Partial<HubRecord>)
      .exec();
    if (!hub) {
      throw new ConnectionServiceError(
        ConnectionServiceErrorCode.HubNotFound,
        `Hub ${hubId} not found`,
      );
    }

    const isMod =
      hub.ownerId === moderatorId ||
      (hub.moderatorIds ?? []).includes(moderatorId);
    if (!isMod) {
      throw new ConnectionServiceError(
        ConnectionServiceErrorCode.HubNotAuthorized,
        'Not authorized to moderate this hub',
      );
    }

    // Cannot ban the owner
    if (hub.ownerId === userId) {
      throw new ConnectionServiceError(
        ConnectionServiceErrorCode.HubNotAuthorized,
        'Cannot ban the hub owner',
      );
    }

    // Remove from membership
    const result = await this.hubMembersCollection
      .deleteOne({ hubId, userId } as Partial<HubMemberRecord>)
      .exec();

    if (result.deletedCount > 0) {
      const newCount = Math.max(0, hub.memberCount - 1);
      await this.hubsCollection
        .updateOne(
          { _id: hubId } as Partial<HubRecord>,
          { memberCount: newCount } as Partial<HubRecord>,
        )
        .exec();
    }

    // Remove from moderators if they were one
    if (hub.moderatorIds?.includes(userId)) {
      const newMods = hub.moderatorIds.filter((id) => id !== userId);
      await this.hubsCollection
        .updateOne(
          { _id: hubId } as Partial<HubRecord>,
          { moderatorIds: newMods } as Partial<HubRecord>,
        )
        .exec();
    }

    // Persist the ban to prevent re-joining
    const existing = await this.hubBannedUsersCollection
      .findOne({ hubId, userId } as Partial<HubBannedUserRecord>)
      .exec();
    if (!existing) {
      await this.hubBannedUsersCollection.create({
        _id: randomUUID(),
        hubId,
        userId,
        bannedBy: moderatorId,
        severity: 'permanent_ban',
        bannedAt: new Date().toISOString(),
      });
    }
  }

  /**
   * Warn a user in a hub (graduated moderation — step 1)
   */
  async warnInHub(
    hubId: string,
    userId: string,
    moderatorId: string,
    reason?: string,
  ): Promise<void> {
    const hub = await this.hubsCollection
      .findOne({ _id: hubId } as Partial<HubRecord>)
      .exec();
    if (!hub) {
      throw new ConnectionServiceError(
        ConnectionServiceErrorCode.HubNotFound,
        `Hub ${hubId} not found`,
      );
    }

    const isMod =
      hub.ownerId === moderatorId ||
      (hub.moderatorIds ?? []).includes(moderatorId);
    if (!isMod) {
      throw new ConnectionServiceError(
        ConnectionServiceErrorCode.HubNotAuthorized,
        'Not authorized to moderate this hub',
      );
    }

    await this.hubBannedUsersCollection.create({
      _id: randomUUID(),
      hubId,
      userId,
      bannedBy: moderatorId,
      reason,
      severity: 'warning',
      bannedAt: new Date().toISOString(),
    });
  }

  /**
   * Temporarily ban a user from a hub (graduated moderation — step 2)
   */
  async tempBanFromHub(
    hubId: string,
    userId: string,
    moderatorId: string,
    durationDays: number,
    reason?: string,
  ): Promise<void> {
    const hub = await this.hubsCollection
      .findOne({ _id: hubId } as Partial<HubRecord>)
      .exec();
    if (!hub) {
      throw new ConnectionServiceError(
        ConnectionServiceErrorCode.HubNotFound,
        `Hub ${hubId} not found`,
      );
    }

    const isMod =
      hub.ownerId === moderatorId ||
      (hub.moderatorIds ?? []).includes(moderatorId);
    if (!isMod) {
      throw new ConnectionServiceError(
        ConnectionServiceErrorCode.HubNotAuthorized,
        'Not authorized to moderate this hub',
      );
    }

    // Remove from membership
    const result = await this.hubMembersCollection
      .deleteOne({ hubId, userId } as Partial<HubMemberRecord>)
      .exec();
    if (result.deletedCount > 0) {
      const newCount = Math.max(0, hub.memberCount - 1);
      await this.hubsCollection
        .updateOne(
          { _id: hubId } as Partial<HubRecord>,
          { memberCount: newCount } as Partial<HubRecord>,
        )
        .exec();
    }

    const expiresAt = new Date(
      Date.now() + durationDays * 86400000,
    ).toISOString();

    await this.hubBannedUsersCollection.create({
      _id: randomUUID(),
      hubId,
      userId,
      bannedBy: moderatorId,
      reason,
      severity: 'temp_ban',
      expiresAt,
      bannedAt: new Date().toISOString(),
    });
  }

  /**
   * Unban a user from a hub (moderator action)
   */
  async unbanFromHub(
    hubId: string,
    userId: string,
    moderatorId: string,
  ): Promise<void> {
    const hub = await this.hubsCollection
      .findOne({ _id: hubId } as Partial<HubRecord>)
      .exec();
    if (!hub) {
      throw new ConnectionServiceError(
        ConnectionServiceErrorCode.HubNotFound,
        `Hub ${hubId} not found`,
      );
    }

    const isMod =
      hub.ownerId === moderatorId ||
      (hub.moderatorIds ?? []).includes(moderatorId);
    if (!isMod) {
      throw new ConnectionServiceError(
        ConnectionServiceErrorCode.HubNotAuthorized,
        'Not authorized to moderate this hub',
      );
    }

    await this.hubBannedUsersCollection
      .deleteOne({ hubId, userId } as Partial<HubBannedUserRecord>)
      .exec();
  }

  /**
   * Get banned users for a hub
   */
  async getBannedUsers(
    hubId: string,
    moderatorId: string,
  ): Promise<HubBannedUserRecord[]> {
    const hub = await this.hubsCollection
      .findOne({ _id: hubId } as Partial<HubRecord>)
      .exec();
    if (!hub) {
      throw new ConnectionServiceError(
        ConnectionServiceErrorCode.HubNotFound,
        `Hub ${hubId} not found`,
      );
    }

    const isMod =
      hub.ownerId === moderatorId ||
      (hub.moderatorIds ?? []).includes(moderatorId);
    if (!isMod) {
      throw new ConnectionServiceError(
        ConnectionServiceErrorCode.HubNotAuthorized,
        'Not authorized to view banned users',
      );
    }

    return this.hubBannedUsersCollection
      .find({ hubId } as Partial<HubBannedUserRecord>)
      .exec();
  }

  /**
   * Transfer hub ownership to another user
   */
  async transferHubOwnership(
    hubId: string,
    currentOwnerId: string,
    newOwnerId: string,
  ): Promise<IBaseHub<string>> {
    const hub = await this.getOwnedHub(hubId, currentOwnerId);

    // Ensure new owner is a member
    const isMember = await this.isHubMember(hubId, newOwnerId);
    if (!isMember) {
      throw new ConnectionServiceError(
        ConnectionServiceErrorCode.HubNotAuthorized,
        'New owner must be a member of the hub',
      );
    }

    // Transfer ownership
    const mods = hub.moderatorIds ?? [];
    // Add new owner to moderators if not already
    if (!mods.includes(newOwnerId)) {
      mods.push(newOwnerId);
    }

    await this.hubsCollection
      .updateOne(
        { _id: hubId } as Partial<HubRecord>,
        {
          ownerId: newOwnerId,
          moderatorIds: mods,
        } as Partial<HubRecord>,
      )
      .exec();

    const updated = await this.hubsCollection
      .findOne({ _id: hubId } as Partial<HubRecord>)
      .exec();
    return this.recordToHub(updated!);
  }

  // ── Mutual Connections ──────────────────────────────────────────────

  /**
   * Build a sorted cache key so that (A,B) and (B,A) share the same entry.
   */
  private mutualCacheKey(userId: string, otherUserId: string): string {
    return [userId, otherUserId].sort().join(':');
  }

  /**
   * Get the set of user IDs that a given user follows.
   */
  private async getFollowedIds(userId: string): Promise<Set<string>> {
    const follows = await this.followsCollection
      .find({ followerId: userId } as Partial<FollowRecord>)
      .exec();
    return new Set(follows.map((f) => f.followedId));
  }

  /**
   * Get mutual connections between two users with pagination.
   * Mutual connections are users that both userId AND otherUserId follow.
   * @see Requirements: 28.1, 28.2
   */
  async getMutualConnections(
    userId: string,
    otherUserId: string,
    options?: IPaginationOptions,
  ): Promise<IPaginatedResult<IBaseUserProfile<string>>> {
    const limit = this.getLimit(options);

    // Get follows for both users
    const [userFollows, otherFollows] = await Promise.all([
      this.getFollowedIds(userId),
      this.getFollowedIds(otherUserId),
    ]);

    // Compute intersection
    const mutualIds: string[] = [];
    for (const id of userFollows) {
      if (otherFollows.has(id)) {
        mutualIds.push(id);
      }
    }

    // Sort for deterministic pagination
    mutualIds.sort();

    // Apply cursor-based pagination
    let startIndex = 0;
    if (options?.cursor) {
      const cursorIdx = mutualIds.indexOf(options.cursor);
      if (cursorIdx !== -1) {
        startIndex = cursorIdx + 1;
      }
    }

    const page = mutualIds.slice(startIndex, startIndex + limit);
    const hasMore = startIndex + limit < mutualIds.length;

    // Look up profiles for the page
    const profiles: IBaseUserProfile<string>[] = [];
    for (const id of page) {
      const record = await this.userProfilesCollection
        .findOne({ _id: id } as Partial<UserProfileRecord>)
        .exec();
      if (record) {
        profiles.push(this.recordToProfile(record));
      }
    }

    return {
      items: profiles,
      cursor: hasMore && page.length > 0 ? page[page.length - 1] : undefined,
      hasMore,
    };
  }

  /**
   * Get the count of mutual connections between two users.
   * Uses an in-memory cache with a 5-minute TTL for performance.
   * @see Requirements: 28.1, 28.5
   */
  async getMutualConnectionCount(
    userId: string,
    otherUserId: string,
  ): Promise<number> {
    const key = this.mutualCacheKey(userId, otherUserId);
    const cached = this.mutualConnectionCache.get(key);
    const now = Date.now();

    if (
      cached &&
      now - cached.timestamp < ConnectionService.MUTUAL_CACHE_TTL_MS
    ) {
      return cached.count;
    }

    // Cache miss – compute intersection count
    const [userFollows, otherFollows] = await Promise.all([
      this.getFollowedIds(userId),
      this.getFollowedIds(otherUserId),
    ]);

    let count = 0;
    for (const id of userFollows) {
      if (otherFollows.has(id)) {
        count++;
      }
    }

    this.mutualConnectionCache.set(key, { count, timestamp: now });
    return count;
  }

  // ═══════════════════════════════════════════════════════
  // Block/Mute Inheritance for Lists (Requirements 32.1-32.5)
  // ═══════════════════════════════════════════════════════

  /**
   * Remove a blocked user from ALL lists owned by the blocker.
   * Finds every list owned by ownerId, removes blockedUserId from each,
   * and decrements member counts accordingly.
   * @see Requirements: 32.1
   */
  async removeBlockedUserFromLists(
    ownerId: string,
    blockedUserId: string,
  ): Promise<void> {
    // Get all lists owned by the blocker
    const lists = await this.listsCollection
      .find({ ownerId } as Partial<ConnectionListRecord>)
      .exec();

    for (const list of lists) {
      // Try to remove the blocked user from this list's members
      const result = await this.listMembersCollection
        .deleteOne({
          listId: list._id,
          userId: blockedUserId,
        } as Partial<ConnectionListMemberRecord>)
        .exec();

      // Decrement member count if a record was actually removed
      if (result.deletedCount > 0) {
        const newCount = Math.max(0, list.memberCount - 1);
        await this.listsCollection
          .updateOne(
            { _id: list._id } as Partial<ConnectionListRecord>,
            {
              memberCount: newCount,
              updatedAt: new Date().toISOString(),
            } as Partial<ConnectionListRecord>,
          )
          .exec();
      }
    }
  }

  /**
   * Check if a user is blocked by the list owner.
   * Used to prevent blocked users from viewing or following lists.
   * @see Requirements: 32.2, 32.3
   */
  async isBlockedFromList(
    userId: string,
    listOwnerId: string,
  ): Promise<boolean> {
    const block = await this.blocksCollection
      .findOne({
        blockerId: listOwnerId,
        blockedId: userId,
      } as Partial<BlockRecord>)
      .exec();

    return block !== null;
  }

  // ═══════════════════════════════════════════════════════
  // List Following Operations
  // ═══════════════════════════════════════════════════════

  /**
   * Follow a public list. Verifies the list exists, is public,
   * the user is not blocked, and is not already following.
   * Increments the list's followerCount.
   * @see Requirements: 33.1, 33.3
   */
  async followList(userId: string, listId: string): Promise<void> {
    // Verify list exists
    const list = await this.listsCollection
      .findOne({ _id: listId } as Partial<ConnectionListRecord>)
      .exec();

    if (!list) {
      throw new ConnectionServiceError(
        ConnectionServiceErrorCode.ListNotFound,
        'List not found',
      );
    }

    // Only public lists can be followed
    if (list.visibility !== ConnectionVisibility.Public) {
      throw new ConnectionServiceError(
        ConnectionServiceErrorCode.ListNotPublic,
        'Only public lists can be followed',
      );
    }

    // Check if user is blocked by the list owner
    const isBlocked = await this.isBlockedFromList(userId, list.ownerId);
    if (isBlocked) {
      throw new ConnectionServiceError(
        ConnectionServiceErrorCode.ListNotFound,
        'List not found',
      );
    }

    // Check if already following
    const existing = await this.listFollowersCollection
      .findOne({
        listId,
        userId,
      } as Partial<ListFollowerRecord>)
      .exec();

    if (existing) {
      throw new ConnectionServiceError(
        ConnectionServiceErrorCode.AlreadyFollowingList,
        'Already following this list',
      );
    }

    // Create follower record
    const now = new Date().toISOString();
    await this.listFollowersCollection.create({
      _id: randomUUID(),
      listId,
      userId,
      followedAt: now,
    });

    // Increment followerCount
    await this.listsCollection
      .updateOne(
        { _id: listId } as Partial<ConnectionListRecord>,
        {
          followerCount: list.followerCount + 1,
          updatedAt: now,
        } as Partial<ConnectionListRecord>,
      )
      .exec();
  }

  /**
   * Unfollow a list, removing the subscription and decrementing followerCount.
   * @see Requirements: 33.5
   */
  async unfollowList(userId: string, listId: string): Promise<void> {
    // Verify the follower record exists
    const existing = await this.listFollowersCollection
      .findOne({
        listId,
        userId,
      } as Partial<ListFollowerRecord>)
      .exec();

    if (!existing) {
      throw new ConnectionServiceError(
        ConnectionServiceErrorCode.NotFollowingList,
        'Not following this list',
      );
    }

    // Delete follower record
    await this.listFollowersCollection
      .deleteOne({ _id: existing._id } as Partial<ListFollowerRecord>)
      .exec();

    // Decrement followerCount
    const list = await this.listsCollection
      .findOne({ _id: listId } as Partial<ConnectionListRecord>)
      .exec();

    if (list) {
      const newCount = Math.max(0, list.followerCount - 1);
      await this.listsCollection
        .updateOne(
          { _id: listId } as Partial<ConnectionListRecord>,
          {
            followerCount: newCount,
            updatedAt: new Date().toISOString(),
          } as Partial<ConnectionListRecord>,
        )
        .exec();
    }
  }

  /**
   * Get all followers of a list with pagination.
   * @see Requirements: 33.6
   */
  async getListFollowers(
    listId: string,
    options?: IPaginationOptions,
  ): Promise<IPaginatedResult<IBaseUserProfile<string>>> {
    const limit = this.getLimit(options);
    const queryLimit = limit + 1;

    let query = this.listFollowersCollection.find({
      listId,
    } as Partial<ListFollowerRecord>);

    if (query.sort) {
      query = query.sort({ followedAt: -1 });
    }

    const allFollowers = await query.exec();
    let filteredFollowers = allFollowers;

    if (options?.cursor) {
      filteredFollowers = allFollowers.filter(
        (f) => f.followedAt < options.cursor!,
      );
    }

    const paginatedFollowers = filteredFollowers.slice(0, queryLimit);
    const hasMore = paginatedFollowers.length > limit;
    const resultFollowers = hasMore
      ? paginatedFollowers.slice(0, limit)
      : paginatedFollowers;

    // Resolve user profiles
    const items: IBaseUserProfile<string>[] = [];
    for (const record of resultFollowers) {
      const profile = await this.userProfilesCollection
        .findOne({ _id: record.userId } as Partial<UserProfileRecord>)
        .exec();
      if (profile) {
        items.push(this.recordToProfile(profile));
      }
    }

    const lastFollower = resultFollowers[resultFollowers.length - 1];
    return {
      items,
      cursor: hasMore && lastFollower ? lastFollower.followedAt : undefined,
      hasMore,
    };
  }

  /**
   * Get all lists a user follows with pagination.
   * @see Requirements: 33.6
   */
  async getFollowedLists(
    userId: string,
    options?: IPaginationOptions,
  ): Promise<IPaginatedResult<IBaseConnectionList<string>>> {
    const limit = this.getLimit(options);
    const queryLimit = limit + 1;

    let query = this.listFollowersCollection.find({
      userId,
    } as Partial<ListFollowerRecord>);

    if (query.sort) {
      query = query.sort({ followedAt: -1 });
    }

    const allFollowed = await query.exec();
    let filteredFollowed = allFollowed;

    if (options?.cursor) {
      filteredFollowed = allFollowed.filter(
        (f) => f.followedAt < options.cursor!,
      );
    }

    const paginatedFollowed = filteredFollowed.slice(0, queryLimit);
    const hasMore = paginatedFollowed.length > limit;
    const resultFollowed = hasMore
      ? paginatedFollowed.slice(0, limit)
      : paginatedFollowed;

    // Resolve list details
    const items: IBaseConnectionList<string>[] = [];
    for (const record of resultFollowed) {
      const list = await this.listsCollection
        .findOne({ _id: record.listId } as Partial<ConnectionListRecord>)
        .exec();
      if (list) {
        items.push(this.recordToList(list));
      }
    }

    const lastFollowed = resultFollowed[resultFollowed.length - 1];
    return {
      items,
      cursor: hasMore && lastFollowed ? lastFollowed.followedAt : undefined,
      hasMore,
    };
  }

  /**
   * Remove all non-owner followers when a list becomes private.
   * Deletes all follower records and resets followerCount to 0.
   * @see Requirements: 33.7
   */
  async removeNonOwnerFollowersOnPrivate(
    listId: string,
    ownerId: string,
  ): Promise<void> {
    // Get all followers for this list
    const followers = await this.listFollowersCollection
      .find({ listId } as Partial<ListFollowerRecord>)
      .exec();

    // Delete all follower records (owner wouldn't normally follow their own list,
    // but skip them just in case)
    for (const follower of followers) {
      if (follower.userId !== ownerId) {
        await this.listFollowersCollection
          .deleteOne({ _id: follower._id } as Partial<ListFollowerRecord>)
          .exec();
      }
    }

    // Reset followerCount to 0
    await this.listsCollection
      .updateOne(
        { _id: listId } as Partial<ConnectionListRecord>,
        {
          followerCount: 0,
          updatedAt: new Date().toISOString(),
        } as Partial<ConnectionListRecord>,
      )
      .exec();
  }
}

/**
 * Factory function to create a ConnectionService instance
 * @param application Application with database collection access
 * @returns A new ConnectionService instance
 */
export function createConnectionService(
  application: IApplicationWithCollections,
): ConnectionService {
  return new ConnectionService(application);
}
