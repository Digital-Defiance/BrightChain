import {
  FriendRequestStatus,
  FriendshipStatus,
  FriendsErrorCode,
  BrightChainStrings,
} from '../enumerations';
import { FriendsServiceError } from '../errors/friendsServiceError';
import { TranslatableBrightChainError } from '../errors/translatableBrightChainError';
import type {
  IBaseFriendRequest,
  IBaseFriendship,
  IFriendRequestResult,
  IFriendsService,
  IFriendsSuggestionProvider,
  IPaginatedResult,
  IPaginationOptions,
} from '../interfaces/friends';

describe('Friends system types', () => {
  // ── Enum value checks ──────────────────────────────────────────────

  describe('FriendRequestStatus', () => {
    it('should have the expected string values', () => {
      expect(FriendRequestStatus.Pending).toBe('pending');
      expect(FriendRequestStatus.Accepted).toBe('accepted');
      expect(FriendRequestStatus.Rejected).toBe('rejected');
      expect(FriendRequestStatus.Cancelled).toBe('cancelled');
    });

    it('should have exactly 4 members', () => {
      const values = Object.values(FriendRequestStatus);
      expect(values).toHaveLength(4);
    });
  });

  describe('FriendshipStatus', () => {
    it('should have the expected string values', () => {
      expect(FriendshipStatus.None).toBe('none');
      expect(FriendshipStatus.PendingSent).toBe('pending_sent');
      expect(FriendshipStatus.PendingReceived).toBe('pending_received');
      expect(FriendshipStatus.Friends).toBe('friends');
    });

    it('should have exactly 4 members', () => {
      const values = Object.values(FriendshipStatus);
      expect(values).toHaveLength(4);
    });
  });

  describe('FriendsErrorCode', () => {
    it('should have the expected string values', () => {
      expect(FriendsErrorCode.SelfRequestNotAllowed).toBe(
        'SELF_REQUEST_NOT_ALLOWED',
      );
      expect(FriendsErrorCode.AlreadyFriends).toBe('ALREADY_FRIENDS');
      expect(FriendsErrorCode.RequestAlreadyExists).toBe(
        'REQUEST_ALREADY_EXISTS',
      );
      expect(FriendsErrorCode.RequestNotFound).toBe('REQUEST_NOT_FOUND');
      expect(FriendsErrorCode.NotFriends).toBe('NOT_FRIENDS');
      expect(FriendsErrorCode.UserBlocked).toBe('USER_BLOCKED');
      expect(FriendsErrorCode.Unauthorized).toBe('UNAUTHORIZED');
    });

    it('should have exactly 7 members', () => {
      const values = Object.values(FriendsErrorCode);
      expect(values).toHaveLength(7);
    });
  });

  // ── FriendsServiceError ────────────────────────────────────────────

  describe('FriendsServiceError', () => {
    it('should extend TranslatableBrightChainError', () => {
      const err = new FriendsServiceError(
        FriendsErrorCode.SelfRequestNotAllowed,
      );
      expect(err).toBeInstanceOf(TranslatableBrightChainError);
      expect(err).toBeInstanceOf(Error);
    });

    it('should expose code and name', () => {
      const err = new FriendsServiceError(FriendsErrorCode.AlreadyFriends);
      expect(err.code).toBe(FriendsErrorCode.AlreadyFriends);
      expect(err.name).toBe('FriendsServiceError');
    });

    it('should have a non-empty i18n message', () => {
      const err = new FriendsServiceError(
        FriendsErrorCode.SelfRequestNotAllowed,
      );
      expect(err.message).toBeTruthy();
      expect(typeof err.message).toBe('string');
      expect(err.message.length).toBeGreaterThan(0);
    });

    it('should map each error code to the correct i18n string key', () => {
      expect(
        FriendsServiceError.getStringKeyForCode(
          FriendsErrorCode.SelfRequestNotAllowed,
        ),
      ).toBe(BrightChainStrings.Error_Friends_SelfRequestNotAllowed);
      expect(
        FriendsServiceError.getStringKeyForCode(
          FriendsErrorCode.AlreadyFriends,
        ),
      ).toBe(BrightChainStrings.Error_Friends_AlreadyFriends);
      expect(
        FriendsServiceError.getStringKeyForCode(
          FriendsErrorCode.RequestAlreadyExists,
        ),
      ).toBe(BrightChainStrings.Error_Friends_RequestAlreadyExists);
      expect(
        FriendsServiceError.getStringKeyForCode(
          FriendsErrorCode.RequestNotFound,
        ),
      ).toBe(BrightChainStrings.Error_Friends_RequestNotFound);
      expect(
        FriendsServiceError.getStringKeyForCode(FriendsErrorCode.NotFriends),
      ).toBe(BrightChainStrings.Error_Friends_NotFriends);
      expect(
        FriendsServiceError.getStringKeyForCode(FriendsErrorCode.UserBlocked),
      ).toBe(BrightChainStrings.Error_Friends_UserBlocked);
      expect(
        FriendsServiceError.getStringKeyForCode(
          FriendsErrorCode.Unauthorized,
        ),
      ).toBe(BrightChainStrings.Error_Friends_Unauthorized);
    });

    it('should produce different messages for different error codes', () => {
      const selfErr = new FriendsServiceError(
        FriendsErrorCode.SelfRequestNotAllowed,
      );
      const alreadyErr = new FriendsServiceError(
        FriendsErrorCode.AlreadyFriends,
      );
      expect(selfErr.message).not.toBe(alreadyErr.message);
    });

    it('should accept a legacy message string without breaking', () => {
      const err = new FriendsServiceError(
        FriendsErrorCode.AlreadyFriends,
        'Already friends',
      );
      expect(err.code).toBe(FriendsErrorCode.AlreadyFriends);
      // The message comes from i18n, not the legacy string
      expect(err.message).toBeTruthy();
    });
  });

  // ── Compile-time interface checks ──────────────────────────────────

  describe('IBaseFriendship<string>', () => {
    it('should accept a valid friendship object', () => {
      const friendship: IBaseFriendship<string> = {
        _id: 'friendship-1',
        memberIdA: 'aaa',
        memberIdB: 'bbb',
        createdAt: new Date().toISOString(),
      };
      expect(friendship._id).toBe('friendship-1');
      expect(friendship.memberIdA).toBe('aaa');
      expect(friendship.memberIdB).toBe('bbb');
      expect(typeof friendship.createdAt).toBe('string');
    });
  });

  describe('IBaseFriendRequest<string>', () => {
    it('should accept a valid friend request object', () => {
      const request: IBaseFriendRequest<string> = {
        _id: 'request-1',
        requesterId: 'user-a',
        recipientId: 'user-b',
        status: FriendRequestStatus.Pending,
        createdAt: new Date().toISOString(),
      };
      expect(request.status).toBe(FriendRequestStatus.Pending);
      expect(request.message).toBeUndefined();
    });

    it('should accept an optional message', () => {
      const request: IBaseFriendRequest<string> = {
        _id: 'request-2',
        requesterId: 'user-a',
        recipientId: 'user-b',
        message: 'Hey, let us be friends!',
        status: FriendRequestStatus.Pending,
        createdAt: new Date().toISOString(),
      };
      expect(request.message).toBe('Hey, let us be friends!');
    });
  });

  describe('IPaginationOptions / IPaginatedResult', () => {
    it('should accept valid pagination options', () => {
      const opts: IPaginationOptions = { cursor: 'abc', limit: 10 };
      expect(opts.limit).toBe(10);
    });

    it('should accept a paginated result', () => {
      const result: IPaginatedResult<string> = {
        items: ['a', 'b'],
        hasMore: true,
        cursor: 'next',
        totalCount: 5,
      };
      expect(result.items).toHaveLength(2);
      expect(result.hasMore).toBe(true);
      expect(result.totalCount).toBe(5);
    });
  });

  describe('IFriendsService compile-time check', () => {
    it('should compile a mock implementation satisfying the interface', () => {
      const noop = () => Promise.resolve() as never;
      const service: IFriendsService = {
        sendFriendRequest: noop,
        acceptFriendRequest: noop,
        rejectFriendRequest: noop,
        cancelFriendRequest: noop,
        removeFriend: noop,
        getFriends: noop,
        getReceivedFriendRequests: noop,
        getSentFriendRequests: noop,
        getFriendshipStatus: noop,
        areFriends: noop,
        getMutualFriends: noop,
        onUserBlocked: noop,
      };
      expect(service).toBeDefined();
      expect(typeof service.sendFriendRequest).toBe('function');
      expect(typeof service.areFriends).toBe('function');
      expect(typeof service.onUserBlocked).toBe('function');
    });
  });

  describe('IFriendRequestResult compile-time check', () => {
    it('should accept a successful result with autoAccepted', () => {
      const result: IFriendRequestResult = {
        success: true,
        autoAccepted: true,
        friendship: {
          _id: 'f1',
          memberIdA: 'a',
          memberIdB: 'b',
          createdAt: new Date().toISOString(),
        },
      };
      expect(result.success).toBe(true);
      expect(result.autoAccepted).toBe(true);
    });
  });

  describe('IFriendsSuggestionProvider compile-time check', () => {
    it('should compile a mock implementation satisfying the interface', () => {
      const noop = () => Promise.resolve() as never;
      const provider: IFriendsSuggestionProvider = {
        getFriendSuggestions: noop,
      };
      expect(provider).toBeDefined();
      expect(typeof provider.getFriendSuggestions).toBe('function');
    });
  });
});
