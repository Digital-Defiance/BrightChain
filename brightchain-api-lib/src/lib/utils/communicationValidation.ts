/**
 * Express-validator validation chains for Communication API request payloads.
 * These are wired into RouteConfig.validation in each communication controller.
 *
 * Requirements: 10.2, 10.4
 */

import {
  ChannelVisibility,
  DefaultRole,
  PresenceStatus,
} from '@brightchain/brightchain-lib';
import { body, param, query, ValidationChain } from 'express-validator';

// ─── Direct Message validations ─────────────────────────────────────────────

export const sendDirectMessageValidation: ValidationChain[] = [
  body('recipientId')
    .isString()
    .notEmpty()
    .withMessage('recipientId is required and must be a non-empty string'),
  body('content')
    .isString()
    .notEmpty()
    .withMessage('content is required and must be a non-empty string'),
];

export const listConversationsValidation: ValidationChain[] = [
  query('cursor').optional().isString().withMessage('cursor must be a string'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit must be an integer between 1 and 100'),
];

export const getConversationMessagesValidation: ValidationChain[] = [
  param('conversationId')
    .isString()
    .notEmpty()
    .withMessage('conversationId is required'),
  query('cursor').optional().isString().withMessage('cursor must be a string'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit must be an integer between 1 and 100'),
];

export const deleteConversationMessageValidation: ValidationChain[] = [
  param('conversationId')
    .isString()
    .notEmpty()
    .withMessage('conversationId is required'),
  param('messageId').isString().notEmpty().withMessage('messageId is required'),
];

export const promoteConversationValidation: ValidationChain[] = [
  param('conversationId')
    .isString()
    .notEmpty()
    .withMessage('conversationId is required'),
  body('newMemberIds')
    .isArray({ min: 1 })
    .withMessage('newMemberIds must be a non-empty array'),
  body('newMemberIds.*')
    .isString()
    .notEmpty()
    .withMessage('each newMemberIds entry must be a non-empty string'),
];

// ─── Group validations ──────────────────────────────────────────────────────

export const createGroupValidation: ValidationChain[] = [
  body('name')
    .isString()
    .notEmpty()
    .withMessage('name is required and must be a non-empty string'),
  body('memberIds')
    .isArray({ min: 1 })
    .withMessage('memberIds must be a non-empty array'),
  body('memberIds.*')
    .isString()
    .notEmpty()
    .withMessage('each memberIds entry must be a non-empty string'),
];

export const groupIdParamValidation: ValidationChain[] = [
  param('groupId').isString().notEmpty().withMessage('groupId is required'),
];

export const sendGroupMessageValidation: ValidationChain[] = [
  param('groupId').isString().notEmpty().withMessage('groupId is required'),
  body('content')
    .isString()
    .notEmpty()
    .withMessage('content is required and must be a non-empty string'),
];

export const getGroupMessagesValidation: ValidationChain[] = [
  param('groupId').isString().notEmpty().withMessage('groupId is required'),
  query('cursor').optional().isString().withMessage('cursor must be a string'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit must be an integer between 1 and 100'),
];

export const addGroupMembersValidation: ValidationChain[] = [
  param('groupId').isString().notEmpty().withMessage('groupId is required'),
  body('memberIds')
    .isArray({ min: 1 })
    .withMessage('memberIds must be a non-empty array'),
  body('memberIds.*')
    .isString()
    .notEmpty()
    .withMessage('each memberIds entry must be a non-empty string'),
];

export const removeGroupMemberValidation: ValidationChain[] = [
  param('groupId').isString().notEmpty().withMessage('groupId is required'),
  param('memberId').isString().notEmpty().withMessage('memberId is required'),
];

export const leaveGroupValidation: ValidationChain[] = [
  param('groupId').isString().notEmpty().withMessage('groupId is required'),
];

const validRoles = Object.values(DefaultRole);

export const assignGroupRoleValidation: ValidationChain[] = [
  param('groupId').isString().notEmpty().withMessage('groupId is required'),
  param('memberId').isString().notEmpty().withMessage('memberId is required'),
  body('role')
    .isString()
    .isIn(validRoles)
    .withMessage(`role must be one of: ${validRoles.join(', ')}`),
];

export const addGroupReactionValidation: ValidationChain[] = [
  param('groupId').isString().notEmpty().withMessage('groupId is required'),
  param('messageId').isString().notEmpty().withMessage('messageId is required'),
  body('emoji')
    .isString()
    .notEmpty()
    .withMessage('emoji is required and must be a non-empty string'),
];

export const removeGroupReactionValidation: ValidationChain[] = [
  param('groupId').isString().notEmpty().withMessage('groupId is required'),
  param('messageId').isString().notEmpty().withMessage('messageId is required'),
  param('reactionId')
    .isString()
    .notEmpty()
    .withMessage('reactionId is required'),
];

export const editGroupMessageValidation: ValidationChain[] = [
  param('groupId').isString().notEmpty().withMessage('groupId is required'),
  param('messageId').isString().notEmpty().withMessage('messageId is required'),
  body('content')
    .isString()
    .notEmpty()
    .withMessage('content is required and must be a non-empty string'),
];

export const pinGroupMessageValidation: ValidationChain[] = [
  param('groupId').isString().notEmpty().withMessage('groupId is required'),
  param('messageId').isString().notEmpty().withMessage('messageId is required'),
];

// ─── Channel validations ────────────────────────────────────────────────────

const validVisibilities = Object.values(ChannelVisibility);

export const createChannelValidation: ValidationChain[] = [
  body('name')
    .isString()
    .notEmpty()
    .withMessage('name is required and must be a non-empty string'),
  body('visibility')
    .isString()
    .isIn(validVisibilities)
    .withMessage(`visibility must be one of: ${validVisibilities.join(', ')}`),
  body('topic').optional().isString().withMessage('topic must be a string'),
];

export const listChannelsValidation: ValidationChain[] = [
  query('cursor').optional().isString().withMessage('cursor must be a string'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit must be an integer between 1 and 100'),
];

export const channelIdParamValidation: ValidationChain[] = [
  param('channelId').isString().notEmpty().withMessage('channelId is required'),
];

export const updateChannelValidation: ValidationChain[] = [
  param('channelId').isString().notEmpty().withMessage('channelId is required'),
  body('name')
    .optional()
    .isString()
    .notEmpty()
    .withMessage('name must be a non-empty string'),
  body('topic').optional().isString().withMessage('topic must be a string'),
  body('visibility')
    .optional()
    .isString()
    .isIn(validVisibilities)
    .withMessage(`visibility must be one of: ${validVisibilities.join(', ')}`),
  body('historyVisibleToNewMembers')
    .optional()
    .isBoolean()
    .withMessage('historyVisibleToNewMembers must be a boolean'),
];

export const joinChannelValidation: ValidationChain[] = [
  param('channelId').isString().notEmpty().withMessage('channelId is required'),
];

export const leaveChannelValidation: ValidationChain[] = [
  param('channelId').isString().notEmpty().withMessage('channelId is required'),
];

export const sendChannelMessageValidation: ValidationChain[] = [
  param('channelId').isString().notEmpty().withMessage('channelId is required'),
  body('content')
    .isString()
    .notEmpty()
    .withMessage('content is required and must be a non-empty string'),
];

export const getChannelMessagesValidation: ValidationChain[] = [
  param('channelId').isString().notEmpty().withMessage('channelId is required'),
  query('cursor').optional().isString().withMessage('cursor must be a string'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit must be an integer between 1 and 100'),
];

export const searchChannelMessagesValidation: ValidationChain[] = [
  param('channelId').isString().notEmpty().withMessage('channelId is required'),
  query('query')
    .isString()
    .notEmpty()
    .withMessage('query is required and must be a non-empty string'),
  query('cursor').optional().isString().withMessage('cursor must be a string'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit must be an integer between 1 and 100'),
];

export const createInviteValidation: ValidationChain[] = [
  param('channelId').isString().notEmpty().withMessage('channelId is required'),
  body('maxUses')
    .optional()
    .isInt({ min: 1 })
    .withMessage('maxUses must be a positive integer'),
  body('expiresInMs')
    .optional()
    .isInt({ min: 1 })
    .withMessage('expiresInMs must be a positive integer'),
];

export const redeemInviteValidation: ValidationChain[] = [
  param('channelId').isString().notEmpty().withMessage('channelId is required'),
  param('token').isString().notEmpty().withMessage('token is required'),
];

export const assignChannelRoleValidation: ValidationChain[] = [
  param('channelId').isString().notEmpty().withMessage('channelId is required'),
  param('memberId').isString().notEmpty().withMessage('memberId is required'),
  body('role')
    .isString()
    .isIn(validRoles)
    .withMessage(`role must be one of: ${validRoles.join(', ')}`),
];

export const addChannelReactionValidation: ValidationChain[] = [
  param('channelId').isString().notEmpty().withMessage('channelId is required'),
  param('messageId').isString().notEmpty().withMessage('messageId is required'),
  body('emoji')
    .isString()
    .notEmpty()
    .withMessage('emoji is required and must be a non-empty string'),
];

export const removeChannelReactionValidation: ValidationChain[] = [
  param('channelId').isString().notEmpty().withMessage('channelId is required'),
  param('messageId').isString().notEmpty().withMessage('messageId is required'),
  param('reactionId')
    .isString()
    .notEmpty()
    .withMessage('reactionId is required'),
];

export const editChannelMessageValidation: ValidationChain[] = [
  param('channelId').isString().notEmpty().withMessage('channelId is required'),
  param('messageId').isString().notEmpty().withMessage('messageId is required'),
  body('content')
    .isString()
    .notEmpty()
    .withMessage('content is required and must be a non-empty string'),
];

export const pinChannelMessageValidation: ValidationChain[] = [
  param('channelId').isString().notEmpty().withMessage('channelId is required'),
  param('messageId').isString().notEmpty().withMessage('messageId is required'),
];

export const muteChannelMemberValidation: ValidationChain[] = [
  param('channelId').isString().notEmpty().withMessage('channelId is required'),
  param('memberId').isString().notEmpty().withMessage('memberId is required'),
  body('durationMs')
    .isInt({ min: 1 })
    .withMessage('durationMs is required and must be a positive integer'),
];

export const kickChannelMemberValidation: ValidationChain[] = [
  param('channelId').isString().notEmpty().withMessage('channelId is required'),
  param('memberId').isString().notEmpty().withMessage('memberId is required'),
];

// ─── Presence validations ───────────────────────────────────────────────────

const validPresenceStatuses = Object.values(PresenceStatus);

export const setPresenceValidation: ValidationChain[] = [
  body('status')
    .isString()
    .isIn(validPresenceStatuses)
    .withMessage(`status must be one of: ${validPresenceStatuses.join(', ')}`),
];
