/**
 * FriendsService implementation.
 *
 * Manages symmetric friend relationships, friend requests, and block integration.
 * Uses the same MockCollection / IApplicationWithCollections pattern as UserProfileService.
 *
 * @see Requirements: 1.1–1.6, 2.1–2.4, 3.1–3.3, 4.1–4.3, 5.1–5.3,
 *   6.1–6.3, 7.1–7.3, 8.1–8.3, 9.1–9.3, 10.1–10.3
 */

import { randomUUID } from 'crypto';
import {
  FriendRequestStatus,
  FriendshipStatus,
  FriendsErrorCode,
  sortPair,
} from '@brightchain/brightchain-lib';
import { FriendsServiceError } from '@brightchain/brightchain-lib';
import type {
  IFriendsService,
  IFriendRequestResult,
  IBaseFriendship,
  IBaseFriendRequest,
  IPaginatedResult,
  IPaginationOptions,
} from '@brightchain/brightchain-lib';

// ── Database record types ──────────────────────────────────────────────

interface FriendshipRecord {
  _id: string;
  memberIdA: string;
  memberIdB: string;
  createdAt: string;
}

interface FriendRequestRecord {
  _id: string;
  requesterId: string;
  recipientId: string;
  message?: string;
  status: string;
  createdAt: string;
}

// ── Collection / Application interfaces (same as UserProfileService) ───

interface FindQuery<T> {
  sort(field: Record<string, 1 | -1>): FindQuery<T>;
  skip(count: number): FindQuery<T>;
  limit(count: number): FindQuery<T>;
  exec(): Promise<T[]>;
}

type QueryFilter<T> = Partial<T> | Record<string, unknown>;

interface Collection<T> {
  create(record: T): Promise<T>;
  findOne(filter: QueryFilter<T>): { exec(): Promise<T | null> };
  find(filter: QueryFilter<T>): FindQuery<T>;
  updateOne(
    filter: QueryFilter<T>,
    update: Partial<T>,
  ): { exec(): Promise<{ modifiedCount: number }> };
  deleteOne(filter: QueryFilter<T>): {
    exec(): Promise<{ deletedCount: number }>;
  };
}

interface IApplicationWithCollections {
  getModel<T>(name: string): Collection<T>;
}

// ── Default pagination ─────────────────────────────────────────────────

const DEFAULT_LIMIT = 20;

// ── Service implementation ─────────────────────────────────────────────

export class FriendsService implements IFriendsService {
  private readonly friendshipsCollection: Collection<FriendshipRecord>;
  private readonly friendRequestsCollection: Collection<FriendRequestRecord>;
  private readonly isBlocked: (a: string, b: string) => Promise<boolean>;
  private readonly onFriendshipChanged?: (
    memberIdA: string,
    memberIdB: string,
    delta: 1 | -1,
  ) => Promise<void>;

  constructor(
    application: IApplicationWithCollections,
    isBlocked: (a: string, b: string) => Promise<boolean>,
    onFriendshipChanged?: (
      memberIdA: string,
      memberIdB: string,
      delta: 1 | -1,
    ) => Promise<void>,
  ) {
    this.friendshipsCollection =
      application.getModel<FriendshipRecord>('brightchain_friendships');
    this.friendRequestsCollection =
      application.getModel<FriendRequestRecord>('brightchain_friend_requests');
    this.isBlocked = isBlocked;
    this.onFriendshipChanged = onFriendshipChanged;
  }

  // ── Helper ───────────────────────────────────────────────────────────

  private getLimit(options?: IPaginationOptions): number {
    return options?.limit ?? DEFAULT_LIMIT;
  }

  private async findFriendship(
    idA: string,
    idB: string,
  ): Promise<FriendshipRecord | null> {
    const [memberIdA, memberIdB] = sortPair(idA, idB);
    return this.friendshipsCollection
      .findOne({ memberIdA, memberIdB } as Partial<FriendshipRecord>)
      .exec();
  }

  // ── sendFriendRequest ────────────────────────────────────────────────

  async sendFriendRequest(
    requesterId: string,
    recipientId: string,
    message?: string,
  ): Promise<IFriendRequestResult> {
    // 1. Self-request check
    if (requesterId === recipientId) {
      throw new FriendsServiceError(FriendsErrorCode.SelfRequestNotAllowed);
    }

    // 2. Block check (both directions)
    if (await this.isBlocked(requesterId, recipientId)) {
      throw new FriendsServiceError(FriendsErrorCode.UserBlocked);
    }

    // 3. Already friends check
    const existingFriendship = await this.findFriendship(
      requesterId,
      recipientId,
    );
    if (existingFriendship) {
      throw new FriendsServiceError(FriendsErrorCode.AlreadyFriends);
    }

    // 4. Duplicate pending request check (same direction)
    const existingRequest = await this.friendRequestsCollection
      .findOne({
        requesterId,
        recipientId,
        status: FriendRequestStatus.Pending,
      } as Partial<FriendRequestRecord>)
      .exec();
    if (existingRequest) {
      throw new FriendsServiceError(FriendsErrorCode.RequestAlreadyExists);
    }

    // 5. Reciprocal pending request check (auto-accept)
    const reciprocalRequest = await this.friendRequestsCollection
      .findOne({
        requesterId: recipientId,
        recipientId: requesterId,
        status: FriendRequestStatus.Pending,
      } as Partial<FriendRequestRecord>)
      .exec();

    if (reciprocalRequest) {
      // Auto-accept: update reciprocal request to accepted
      await this.friendRequestsCollection
        .updateOne(
          { _id: reciprocalRequest._id } as Partial<FriendRequestRecord>,
          { status: FriendRequestStatus.Accepted } as Partial<FriendRequestRecord>,
        )
        .exec();

      // Create the new request as accepted too
      const now = new Date().toISOString();
      const newRequest: FriendRequestRecord = {
        _id: randomUUID(),
        requesterId,
        recipientId,
        message,
        status: FriendRequestStatus.Accepted,
        createdAt: now,
      };
      await this.friendRequestsCollection.create(newRequest);

      // Create friendship
      const [memberIdA, memberIdB] = sortPair(requesterId, recipientId);
      const friendship: FriendshipRecord = {
        _id: randomUUID(),
        memberIdA,
        memberIdB,
        createdAt: now,
      };
      await this.friendshipsCollection.create(friendship);

      if (this.onFriendshipChanged) {
        await this.onFriendshipChanged(memberIdA, memberIdB, 1);
      }

      return {
        success: true,
        autoAccepted: true,
        friendship: friendship as IBaseFriendship<string>,
        friendRequest: newRequest as IBaseFriendRequest<string>,
      };
    }

    // 6. Normal case: create pending request
    const now = new Date().toISOString();
    const friendRequest: FriendRequestRecord = {
      _id: randomUUID(),
      requesterId,
      recipientId,
      message,
      status: FriendRequestStatus.Pending,
      createdAt: now,
    };
    await this.friendRequestsCollection.create(friendRequest);

    return {
      success: true,
      friendRequest: friendRequest as IBaseFriendRequest<string>,
    };
  }

  // ── acceptFriendRequest ──────────────────────────────────────────────

  async acceptFriendRequest(
    userId: string,
    requestId: string,
  ): Promise<void> {
    const request = await this.friendRequestsCollection
      .findOne({ _id: requestId } as Partial<FriendRequestRecord>)
      .exec();

    if (!request || request.status !== FriendRequestStatus.Pending) {
      throw new FriendsServiceError(FriendsErrorCode.RequestNotFound);
    }

    if (request.recipientId !== userId) {
      throw new FriendsServiceError(FriendsErrorCode.Unauthorized);
    }

    // Update request status
    await this.friendRequestsCollection
      .updateOne(
        { _id: requestId } as Partial<FriendRequestRecord>,
        { status: FriendRequestStatus.Accepted } as Partial<FriendRequestRecord>,
      )
      .exec();

    // Create friendship with sorted pair
    const [memberIdA, memberIdB] = sortPair(
      request.requesterId,
      request.recipientId,
    );
    const friendship: FriendshipRecord = {
      _id: randomUUID(),
      memberIdA,
      memberIdB,
      createdAt: new Date().toISOString(),
    };
    await this.friendshipsCollection.create(friendship);

    if (this.onFriendshipChanged) {
      await this.onFriendshipChanged(memberIdA, memberIdB, 1);
    }
  }

  // ── rejectFriendRequest ──────────────────────────────────────────────

  async rejectFriendRequest(
    userId: string,
    requestId: string,
  ): Promise<void> {
    const request = await this.friendRequestsCollection
      .findOne({ _id: requestId } as Partial<FriendRequestRecord>)
      .exec();

    if (!request || request.status !== FriendRequestStatus.Pending) {
      throw new FriendsServiceError(FriendsErrorCode.RequestNotFound);
    }

    if (request.recipientId !== userId) {
      throw new FriendsServiceError(FriendsErrorCode.Unauthorized);
    }

    await this.friendRequestsCollection
      .updateOne(
        { _id: requestId } as Partial<FriendRequestRecord>,
        { status: FriendRequestStatus.Rejected } as Partial<FriendRequestRecord>,
      )
      .exec();
  }

  // ── cancelFriendRequest ──────────────────────────────────────────────

  async cancelFriendRequest(
    userId: string,
    requestId: string,
  ): Promise<void> {
    const request = await this.friendRequestsCollection
      .findOne({ _id: requestId } as Partial<FriendRequestRecord>)
      .exec();

    if (!request || request.status !== FriendRequestStatus.Pending) {
      throw new FriendsServiceError(FriendsErrorCode.RequestNotFound);
    }

    if (request.requesterId !== userId) {
      throw new FriendsServiceError(FriendsErrorCode.Unauthorized);
    }

    await this.friendRequestsCollection
      .updateOne(
        { _id: requestId } as Partial<FriendRequestRecord>,
        { status: FriendRequestStatus.Cancelled } as Partial<FriendRequestRecord>,
      )
      .exec();
  }

  // ── removeFriend ─────────────────────────────────────────────────────

  async removeFriend(userId: string, friendId: string): Promise<void> {
    const [memberIdA, memberIdB] = sortPair(userId, friendId);
    const result = await this.friendshipsCollection
      .deleteOne({ memberIdA, memberIdB } as Partial<FriendshipRecord>)
      .exec();

    if (result.deletedCount === 0) {
      throw new FriendsServiceError(FriendsErrorCode.NotFriends);
    }

    if (this.onFriendshipChanged) {
      await this.onFriendshipChanged(memberIdA, memberIdB, -1);
    }
  }

  // ── getFriends ───────────────────────────────────────────────────────

  async getFriends(
    userId: string,
    options?: IPaginationOptions,
  ): Promise<IPaginatedResult<IBaseFriendship<string>>> {
    const limit = this.getLimit(options);

    // Query both columns
    const asA = await this.friendshipsCollection
      .find({ memberIdA: userId } as Partial<FriendshipRecord>)
      .sort({ createdAt: -1 })
      .exec();
    const asB = await this.friendshipsCollection
      .find({ memberIdB: userId } as Partial<FriendshipRecord>)
      .sort({ createdAt: -1 })
      .exec();

    // Merge and deduplicate
    const allMap = new Map<string, FriendshipRecord>();
    for (const f of [...asA, ...asB]) {
      allMap.set(f._id, f);
    }
    const all = Array.from(allMap.values()).sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    const totalCount = all.length;
    const items = all.slice(0, limit) as IBaseFriendship<string>[];

    return {
      items,
      hasMore: totalCount > limit,
      totalCount,
    };
  }

  // ── getReceivedFriendRequests ────────────────────────────────────────

  async getReceivedFriendRequests(
    userId: string,
    options?: IPaginationOptions,
  ): Promise<IPaginatedResult<IBaseFriendRequest<string>>> {
    const limit = this.getLimit(options);
    const items = await this.friendRequestsCollection
      .find({
        recipientId: userId,
        status: FriendRequestStatus.Pending,
      } as Partial<FriendRequestRecord>)
      .sort({ createdAt: -1 })
      .limit(limit + 1)
      .exec();

    const hasMore = items.length > limit;
    const page = items.slice(0, limit) as IBaseFriendRequest<string>[];

    return { items: page, hasMore };
  }

  // ── getSentFriendRequests ────────────────────────────────────────────

  async getSentFriendRequests(
    userId: string,
    options?: IPaginationOptions,
  ): Promise<IPaginatedResult<IBaseFriendRequest<string>>> {
    const limit = this.getLimit(options);
    const items = await this.friendRequestsCollection
      .find({
        requesterId: userId,
        status: FriendRequestStatus.Pending,
      } as Partial<FriendRequestRecord>)
      .sort({ createdAt: -1 })
      .limit(limit + 1)
      .exec();

    const hasMore = items.length > limit;
    const page = items.slice(0, limit) as IBaseFriendRequest<string>[];

    return { items: page, hasMore };
  }

  // ── getFriendshipStatus ──────────────────────────────────────────────

  async getFriendshipStatus(
    userId: string,
    otherUserId: string,
  ): Promise<FriendshipStatus> {
    // Check friendship first
    const friendship = await this.findFriendship(userId, otherUserId);
    if (friendship) {
      return FriendshipStatus.Friends;
    }

    // Check pending requests
    const sentRequest = await this.friendRequestsCollection
      .findOne({
        requesterId: userId,
        recipientId: otherUserId,
        status: FriendRequestStatus.Pending,
      } as Partial<FriendRequestRecord>)
      .exec();
    if (sentRequest) {
      return FriendshipStatus.PendingSent;
    }

    const receivedRequest = await this.friendRequestsCollection
      .findOne({
        requesterId: otherUserId,
        recipientId: userId,
        status: FriendRequestStatus.Pending,
      } as Partial<FriendRequestRecord>)
      .exec();
    if (receivedRequest) {
      return FriendshipStatus.PendingReceived;
    }

    return FriendshipStatus.None;
  }

  // ── areFriends ───────────────────────────────────────────────────────

  async areFriends(userIdA: string, userIdB: string): Promise<boolean> {
    const friendship = await this.findFriendship(userIdA, userIdB);
    return friendship !== null;
  }

  // ── getMutualFriends ─────────────────────────────────────────────────

  async getMutualFriends(
    userId: string,
    otherUserId: string,
    options?: IPaginationOptions,
  ): Promise<IPaginatedResult<IBaseFriendship<string>>> {
    const limit = this.getLimit(options);

    // Get friends of userId
    const userFriendsResult = await this.getFriends(userId, { limit: 10000 });
    const userFriendIds = new Set(
      userFriendsResult.items.map((f) =>
        f.memberIdA === userId ? f.memberIdB : f.memberIdA,
      ),
    );

    // Get friends of otherUserId
    const otherFriendsResult = await this.getFriends(otherUserId, {
      limit: 10000,
    });

    // Intersection: friendships of otherUser where the other member is also a friend of userId
    const mutualFriendships = otherFriendsResult.items.filter((f) => {
      const otherId =
        f.memberIdA === otherUserId ? f.memberIdB : f.memberIdA;
      return userFriendIds.has(otherId);
    });

    const totalCount = mutualFriendships.length;
    const items = mutualFriendships.slice(0, limit);

    return { items, hasMore: totalCount > limit, totalCount };
  }

  // ── onUserBlocked ────────────────────────────────────────────────────

  async onUserBlocked(
    blockerId: string,
    blockedId: string,
  ): Promise<void> {
    // Remove friendship if exists
    const [memberIdA, memberIdB] = sortPair(blockerId, blockedId);
    const deleteResult = await this.friendshipsCollection
      .deleteOne({ memberIdA, memberIdB } as Partial<FriendshipRecord>)
      .exec();

    if (deleteResult.deletedCount > 0 && this.onFriendshipChanged) {
      await this.onFriendshipChanged(memberIdA, memberIdB, -1);
    }

    // Cancel pending requests in both directions
    const requests = await this.friendRequestsCollection
      .find({ status: FriendRequestStatus.Pending } as Partial<FriendRequestRecord>)
      .exec();

    for (const req of requests) {
      if (
        (req.requesterId === blockerId && req.recipientId === blockedId) ||
        (req.requesterId === blockedId && req.recipientId === blockerId)
      ) {
        await this.friendRequestsCollection
          .updateOne(
            { _id: req._id } as Partial<FriendRequestRecord>,
            { status: FriendRequestStatus.Cancelled } as Partial<FriendRequestRecord>,
          )
          .exec();
      }
    }
  }
}

// ── Factory function ───────────────────────────────────────────────────

export function createFriendsService(
  application: IApplicationWithCollections,
  isBlocked: (a: string, b: string) => Promise<boolean>,
  onFriendshipChanged?: (
    memberIdA: string,
    memberIdB: string,
    delta: 1 | -1,
  ) => Promise<void>,
): FriendsService {
  return new FriendsService(application, isBlocked, onFriendshipChanged);
}
