/**
 * Property-based tests for the BrightChat API Client (chatApi.ts).
 *
 * Uses fast-check to verify universal properties across randomly generated inputs.
 * Tests mock the AxiosInstance to verify correct HTTP method, URL, and params
 * without making real network calls.
 */

// ─── Mocks ──────────────────────────────────────────────────────────────────
// Mock brightchain-lib to avoid deep initialization chain. Provide only the
// enums/interfaces needed by chatApi.ts.

const DefaultRoleEnum = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MODERATOR: 'moderator',
  MEMBER: 'member',
} as const;

const ChannelVisibilityEnum = {
  PUBLIC: 'public',
  PRIVATE: 'private',
  SECRET: 'secret',
  INVISIBLE: 'invisible',
} as const;

jest.mock('@brightchain/brightchain-lib', () => ({
  DefaultRole: DefaultRoleEnum,
  ChannelVisibility: ChannelVisibilityEnum,
}));

jest.mock('@brightchain/brightchat-lib', () => ({}));

import { AxiosInstance } from 'axios';
import fc from 'fast-check';
import { createChatApiClient, handleApiCall } from '../services/chatApi';

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Creates a fresh mock AxiosInstance with jest.fn() stubs for all HTTP methods. */
function createMockAxios() {
  return {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  } as unknown as AxiosInstance;
}

/** Returns a resolved value shaped like a successful IApiEnvelope response. */
function successEnvelope(data: unknown = {}) {
  return { data: { status: 'success', data } };
}

// ─── Property 8: Role assignment accepts all valid DefaultRole values ───────

describe('Feature: brightchat-frontend, Property 8: Role assignment accepts all valid DefaultRole values', () => {
  let mockAxios: AxiosInstance;

  beforeEach(() => {
    mockAxios = createMockAxios();
  });

  /**
   * **Validates: Requirements 4.8**
   *
   * For any valid DefaultRole (owner, admin, moderator, member),
   * assignGroupRole and assignChannelRole should construct PUT with
   * correct role field.
   */
  it('should construct PUT requests with the correct role field for any valid DefaultRole', () => {
    const roleArb = fc.constantFrom(
      DefaultRoleEnum.OWNER,
      DefaultRoleEnum.ADMIN,
      DefaultRoleEnum.MODERATOR,
      DefaultRoleEnum.MEMBER,
    );

    fc.assert(
      fc.property(
        roleArb,
        fc.uuid(),
        fc.uuid(),
        (role, contextId, memberId) => {
          const client = createChatApiClient(mockAxios);

          // Mock successful responses
          (mockAxios.put as jest.Mock).mockResolvedValue(successEnvelope());

          // Test assignGroupRole
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          client.assignGroupRole(contextId, memberId, { role: role as any });

          expect(mockAxios.put).toHaveBeenCalledWith(
            `/brightchat/groups/${encodeURIComponent(contextId)}/roles/${encodeURIComponent(memberId)}`,
            { role },
          );

          (mockAxios.put as jest.Mock).mockClear();

          // Test assignChannelRole
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          client.assignChannelRole(contextId, memberId, { role: role as any });

          expect(mockAxios.put).toHaveBeenCalledWith(
            `/brightchat/channels/${encodeURIComponent(contextId)}/roles/${encodeURIComponent(memberId)}`,
            { role },
          );

          (mockAxios.put as jest.Mock).mockClear();
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 11: Channel update sends only changed fields ──────────────────

describe('Feature: brightchat-frontend, Property 11: Channel update sends only changed fields', () => {
  let mockAxios: AxiosInstance;

  beforeEach(() => {
    mockAxios = createMockAxios();
  });

  /**
   * **Validates: Requirements 5.9**
   *
   * For any subset of IChannelUpdate fields (name, topic, visibility,
   * historyVisibleToNewMembers), updateChannel should include exactly
   * those fields in the PUT body, with no additional undefined fields.
   */
  it('should include exactly the provided IChannelUpdate fields in the PUT body', () => {
    // Generate arbitrary subsets of IChannelUpdate fields
    const channelUpdateArb = fc.record(
      {
        name: fc.string({ minLength: 1, maxLength: 50 }),
        topic: fc.string({ minLength: 0, maxLength: 200 }),
        visibility: fc.constantFrom(
          ChannelVisibilityEnum.PUBLIC,
          ChannelVisibilityEnum.PRIVATE,
          ChannelVisibilityEnum.SECRET,
          ChannelVisibilityEnum.INVISIBLE,
        ),
        historyVisibleToNewMembers: fc.boolean(),
      },
      { requiredKeys: [] },
    );

    fc.assert(
      fc.property(channelUpdateArb, fc.uuid(), (update, channelId) => {
        const client = createChatApiClient(mockAxios);
        (mockAxios.put as jest.Mock).mockResolvedValue(successEnvelope());

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        client.updateChannel(channelId, update as any);

        expect(mockAxios.put).toHaveBeenCalledTimes(1);

        const [url, body] = (mockAxios.put as jest.Mock).mock.calls[0];

        expect(url).toBe(
          `/brightchat/channels/${encodeURIComponent(channelId)}`,
        );

        // The body should contain exactly the keys present in the update object
        const expectedKeys = Object.keys(update).sort();
        const actualKeys = Object.keys(body).sort();
        expect(actualKeys).toEqual(expectedKeys);

        // Each value should match
        for (const key of expectedKeys) {
          expect(body[key]).toEqual((update as Record<string, unknown>)[key]);
        }

        (mockAxios.put as jest.Mock).mockClear();
      }),
      { numRuns: 100 },
    );
  });
});

// ─── Property 12: Context-aware endpoint routing for reactions ──────────────

describe('Feature: brightchat-frontend, Property 12: Context-aware endpoint routing for reactions', () => {
  let mockAxios: AxiosInstance;

  beforeEach(() => {
    mockAxios = createMockAxios();
  });

  /**
   * **Validates: Requirements 6.1, 6.2**
   *
   * For any context type (group or channel), message ID, and emoji string,
   * the addReaction and removeReaction API client methods should route to
   * the correct endpoint path.
   */
  it('should route reaction requests to the correct context-specific endpoint', () => {
    const contextArb = fc.constantFrom('group' as const, 'channel' as const);
    const emojiArb = fc.constantFrom('👍', '❤️', '😂', '🎉', '🔥', '👀', '✅');

    fc.assert(
      fc.property(
        contextArb,
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        emojiArb,
        (contextType, contextId, messageId, reactionId, emoji) => {
          const client = createChatApiClient(mockAxios);
          (mockAxios.post as jest.Mock).mockResolvedValue(successEnvelope());
          (mockAxios.delete as jest.Mock).mockResolvedValue(successEnvelope());

          const expectedBase =
            contextType === 'group'
              ? `/brightchat/groups/${encodeURIComponent(contextId)}/messages/${encodeURIComponent(messageId)}/reactions`
              : `/brightchat/channels/${encodeURIComponent(contextId)}/messages/${encodeURIComponent(messageId)}/reactions`;

          // Test addReaction
          if (contextType === 'group') {
            client.addGroupReaction(contextId, messageId, { emoji });
          } else {
            client.addChannelReaction(contextId, messageId, { emoji });
          }

          expect(mockAxios.post).toHaveBeenCalledWith(expectedBase, { emoji });

          // Test removeReaction
          if (contextType === 'group') {
            client.removeGroupReaction(contextId, messageId, reactionId);
          } else {
            client.removeChannelReaction(contextId, messageId, reactionId);
          }

          expect(mockAxios.delete).toHaveBeenCalledWith(
            `${expectedBase}/${encodeURIComponent(reactionId)}`,
          );

          (mockAxios.post as jest.Mock).mockClear();
          (mockAxios.delete as jest.Mock).mockClear();
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 21: Pagination parameters forwarded to all list endpoints ─────

describe('Feature: brightchat-frontend, Property 21: Pagination parameters forwarded to all list endpoints', () => {
  let mockAxios: AxiosInstance;

  beforeEach(() => {
    mockAxios = createMockAxios();
  });

  /**
   * **Validates: Requirements 8.2**
   *
   * For any cursor string and limit number, all list endpoint methods
   * should include them as query parameters in the HTTP request.
   */
  it('should forward cursor and limit as query params to all list endpoints', () => {
    const cursorArb = fc.uuid();
    const limitArb = fc.integer({ min: 1, max: 100 });

    fc.assert(
      fc.property(
        cursorArb,
        limitArb,
        fc.uuid(),
        (cursor, limit, contextId) => {
          const client = createChatApiClient(mockAxios);
          (mockAxios.get as jest.Mock).mockResolvedValue(successEnvelope());

          const paginationParams = { cursor, limit };

          // Define all list endpoints and their expected URLs
          const listEndpoints: Array<{
            call: () => void;
            expectedUrl: string;
          }> = [
            {
              call: () => client.listConversations(paginationParams),
              expectedUrl: '/brightchat/conversations',
            },
            {
              call: () =>
                client.getConversationMessages(contextId, paginationParams),
              expectedUrl: `/brightchat/conversations/${encodeURIComponent(contextId)}/messages`,
            },
            {
              call: () => client.getGroupMessages(contextId, paginationParams),
              expectedUrl: `/brightchat/groups/${encodeURIComponent(contextId)}/messages`,
            },
            {
              call: () => client.listChannels(paginationParams),
              expectedUrl: '/brightchat/channels',
            },
            {
              call: () =>
                client.getChannelMessages(contextId, paginationParams),
              expectedUrl: `/brightchat/channels/${encodeURIComponent(contextId)}/messages`,
            },
            {
              call: () =>
                client.searchChannelMessages(contextId, {
                  ...paginationParams,
                  query: 'test',
                }),
              expectedUrl: `/brightchat/channels/${encodeURIComponent(contextId)}/messages/search`,
            },
          ];

          for (const endpoint of listEndpoints) {
            (mockAxios.get as jest.Mock).mockClear();
            endpoint.call();

            expect(mockAxios.get).toHaveBeenCalledTimes(1);
            const callArgs = (mockAxios.get as jest.Mock).mock.calls[0];
            expect(callArgs[0]).toBe(endpoint.expectedUrl);
            expect(callArgs[1]).toBeDefined();
            expect(callArgs[1].params).toBeDefined();
            expect(callArgs[1].params.cursor).toBe(cursor);
            expect(callArgs[1].params.limit).toBe(limit);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 22: API client error handling without unhandled exceptions ────

describe('Feature: brightchat-frontend, Property 22: API client error handling without unhandled exceptions', () => {
  /**
   * **Validates: Requirements 8.4**
   *
   * For any HTTP error status code (400, 403, 404, 409, 410, 500) returned
   * by the server with an IApiEnvelope error body, handleApiCall should
   * throw a controlled Error with the server's error message, never an
   * unhandled/raw Axios error.
   */
  it('should throw a controlled Error with the server message for any HTTP error status', async () => {
    const statusArb = fc.constantFrom(400, 403, 404, 409, 410, 500);
    const messageArb = fc.string({ minLength: 1, maxLength: 200 });
    const codeArb = fc.string({ minLength: 1, maxLength: 30 });

    await fc.assert(
      fc.asyncProperty(
        statusArb,
        messageArb,
        codeArb,
        async (status, message, code) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const axiosError = new Error('Request failed') as any;
          axiosError.isAxiosError = true;
          axiosError.response = {
            status,
            data: {
              status: 'error',
              error: {
                code,
                message,
              },
            },
          };

          // Mock isAxiosError to recognize our error object
          const originalIsAxiosError = jest.requireActual('axios').isAxiosError;
          const _isAxiosErrorCheck =
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            originalIsAxiosError || ((err: any) => err?.isAxiosError === true);

          // handleApiCall should catch the Axios error and throw a controlled Error

          const failingCall = () => Promise.reject(axiosError);

          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await handleApiCall(failingCall as any);
            // Should not reach here
            expect(true).toBe(false);
          } catch (err) {
            // The error should be a controlled Error with the server message
            expect(err).toBeInstanceOf(Error);
            expect((err as Error).message).toBe(message);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
