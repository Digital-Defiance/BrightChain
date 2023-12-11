/**
 * Property tests for Communication API request validation.
 *
 * Feature: communication-api-controllers, Property 28: Request validation error format
 *
 * **Validates: Requirements 10.2, 10.4**
 *
 * For any request payload that fails schema validation, the response SHALL have
 * status code 400, status: 'error', and the error.details object SHALL contain
 * at least one field-level entry identifying the invalid field.
 */

import { ValidationChain, validationResult } from 'express-validator';
import * as fc from 'fast-check';
import {
  assignGroupRoleValidation,
  createChannelValidation,
  createGroupValidation,
  muteChannelMemberValidation,
  promoteConversationValidation,
  sendDirectMessageValidation,
  sendGroupMessageValidation,
} from './communicationValidation';
import { validationError } from './errorResponse';

/**
 * Build a minimal mock Express request with the given body, params, and query.
 * express-validator's .run() only needs these properties.
 */
function mockRequest(opts: {
  body?: Record<string, unknown>;
  params?: Record<string, unknown>;
  query?: Record<string, unknown>;
}): Record<string, unknown> {
  return {
    body: opts.body ?? {},
    params: opts.params ?? {},
    query: opts.query ?? {},
  };
}

/**
 * Run a set of validation chains against a mock request and return
 * the field-level errors as a Record<string, string[]>.
 */
async function runValidation(
  chains: ValidationChain[],
  req: Record<string, unknown>,
): Promise<Record<string, string[]>> {
  for (const chain of chains) {
    await chain.run(req);
  }
  const result = validationResult(req);
  if (result.isEmpty()) return {};

  const errors = result.array();
  const fieldErrors: Record<string, string[]> = {};
  for (const err of errors) {
    if (err.type === 'field') {
      const field = err.path;
      if (!fieldErrors[field]) fieldErrors[field] = [];
      fieldErrors[field].push(err.msg);
    }
  }
  return fieldErrors;
}

describe('Communication API – Property 28: Request validation error format', () => {
  /**
   * **Validates: Requirements 10.2, 10.4**
   *
   * For any request payload that fails schema validation, running the
   * validation chains SHALL produce at least one field-level error,
   * and wrapping those errors via validationError SHALL produce a 400
   * response with field-level details.
   */

  it('sendDirectMessage rejects payloads missing required fields', async () => {
    // Feature: communication-api-controllers, Property 28: Request validation error format
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          recipientId: fc.constantFrom(undefined, '', null, 42),
          content: fc.constantFrom(undefined, '', null, 42),
        }),
        async (badBody) => {
          const req = mockRequest({ body: badBody });
          const fieldErrors = await runValidation(
            sendDirectMessageValidation,
            req,
          );

          // At least one field must have an error
          expect(Object.keys(fieldErrors).length).toBeGreaterThan(0);

          // Wrapping in validationError produces 400
          const result = validationError('Validation failed', fieldErrors);
          expect(result.statusCode).toBe(400);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('createGroup rejects payloads missing required fields', async () => {
    // Feature: communication-api-controllers, Property 28: Request validation error format
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          name: fc.constantFrom(undefined, '', null),
          memberIds: fc.constantFrom(undefined, null, 'not-array', []),
        }),
        async (badBody) => {
          const req = mockRequest({ body: badBody });
          const fieldErrors = await runValidation(createGroupValidation, req);

          expect(Object.keys(fieldErrors).length).toBeGreaterThan(0);

          const result = validationError('Validation failed', fieldErrors);
          expect(result.statusCode).toBe(400);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('createChannel rejects payloads with invalid visibility', async () => {
    // Feature: communication-api-controllers, Property 28: Request validation error format
    await fc.assert(
      fc.asyncProperty(
        fc
          .string({ minLength: 1, maxLength: 20 })
          .filter(
            (s) => !['public', 'private', 'secret', 'invisible'].includes(s),
          ),
        async (badVisibility) => {
          const req = mockRequest({
            body: { name: 'test-channel', visibility: badVisibility },
          });
          const fieldErrors = await runValidation(createChannelValidation, req);

          expect(fieldErrors['visibility']).toBeDefined();
          expect(fieldErrors['visibility'].length).toBeGreaterThan(0);

          const result = validationError('Validation failed', fieldErrors);
          expect(result.statusCode).toBe(400);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('assignGroupRole rejects payloads with invalid role', async () => {
    // Feature: communication-api-controllers, Property 28: Request validation error format
    await fc.assert(
      fc.asyncProperty(
        fc
          .string({ minLength: 1, maxLength: 20 })
          .filter(
            (s) => !['owner', 'admin', 'moderator', 'member'].includes(s),
          ),
        async (badRole) => {
          const req = mockRequest({
            params: { groupId: 'g1', memberId: 'm1' },
            body: { role: badRole },
          });
          const fieldErrors = await runValidation(
            assignGroupRoleValidation,
            req,
          );

          expect(fieldErrors['role']).toBeDefined();

          const result = validationError('Validation failed', fieldErrors);
          expect(result.statusCode).toBe(400);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('muteChannelMember rejects non-positive durationMs', async () => {
    // Feature: communication-api-controllers, Property 28: Request validation error format
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.constant(0),
          fc.constant(-1),
          fc.integer({ max: -1 }),
          fc.constant(undefined),
          fc.constant('not-a-number'),
        ),
        async (badDuration) => {
          const req = mockRequest({
            params: { channelId: 'c1', memberId: 'm1' },
            body: { durationMs: badDuration },
          });
          const fieldErrors = await runValidation(
            muteChannelMemberValidation,
            req,
          );

          expect(fieldErrors['durationMs']).toBeDefined();

          const result = validationError('Validation failed', fieldErrors);
          expect(result.statusCode).toBe(400);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('valid payloads produce no validation errors', async () => {
    // Feature: communication-api-controllers, Property 28: Request validation error format
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.string({ minLength: 1, maxLength: 200 }),
        async (recipientId, content) => {
          const req = mockRequest({ body: { recipientId, content } });
          const fieldErrors = await runValidation(
            sendDirectMessageValidation,
            req,
          );

          expect(Object.keys(fieldErrors).length).toBe(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('field-level errors identify the specific invalid field', async () => {
    // Feature: communication-api-controllers, Property 28: Request validation error format
    await fc.assert(
      fc.asyncProperty(fc.uuid(), async (groupId) => {
        // Missing content field
        const req = mockRequest({ params: { groupId }, body: {} });
        const fieldErrors = await runValidation(
          sendGroupMessageValidation,
          req,
        );

        // The 'content' field specifically should be flagged
        expect(fieldErrors['content']).toBeDefined();
        expect(fieldErrors['content'].length).toBeGreaterThan(0);

        // groupId param should NOT be flagged (it's valid)
        expect(fieldErrors['groupId']).toBeUndefined();
      }),
      { numRuns: 100 },
    );
  });

  it('promoteConversation rejects empty newMemberIds array', async () => {
    // Feature: communication-api-controllers, Property 28: Request validation error format
    await fc.assert(
      fc.asyncProperty(fc.uuid(), async (conversationId) => {
        const req = mockRequest({
          params: { conversationId },
          body: { newMemberIds: [] },
        });
        const fieldErrors = await runValidation(
          promoteConversationValidation,
          req,
        );

        expect(fieldErrors['newMemberIds']).toBeDefined();

        const result = validationError('Validation failed', fieldErrors);
        expect(result.statusCode).toBe(400);
      }),
      { numRuns: 100 },
    );
  });
});
