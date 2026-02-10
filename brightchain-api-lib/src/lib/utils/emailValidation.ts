/**
 * Express-validator validation chains for Email API request payloads.
 * These are wired into RouteConfig.validation in the EmailController.
 *
 * Requirements: 13.1, 13.2
 */

import { body, param, query, ValidationChain } from 'express-validator';

// ─── Send Email validations ─────────────────────────────────────────────────

export const sendEmailValidation: ValidationChain[] = [
  body('from.localPart')
    .isString()
    .notEmpty()
    .withMessage('from.localPart is required and must be a non-empty string'),
  body('from.domain')
    .isString()
    .notEmpty()
    .withMessage('from.domain is required and must be a non-empty string'),
  body('from.displayName')
    .optional()
    .isString()
    .withMessage('from.displayName must be a string'),
  body('to').optional().isArray().withMessage('to must be an array'),
  body('to.*.localPart')
    .isString()
    .notEmpty()
    .withMessage('each to entry must have a non-empty localPart'),
  body('to.*.domain')
    .isString()
    .notEmpty()
    .withMessage('each to entry must have a non-empty domain'),
  body('to.*.displayName')
    .optional()
    .isString()
    .withMessage('each to displayName must be a string'),
  body('cc').optional().isArray().withMessage('cc must be an array'),
  body('cc.*.localPart')
    .isString()
    .notEmpty()
    .withMessage('each cc entry must have a non-empty localPart'),
  body('cc.*.domain')
    .isString()
    .notEmpty()
    .withMessage('each cc entry must have a non-empty domain'),
  body('cc.*.displayName')
    .optional()
    .isString()
    .withMessage('each cc displayName must be a string'),
  body('bcc').optional().isArray().withMessage('bcc must be an array'),
  body('bcc.*.localPart')
    .isString()
    .notEmpty()
    .withMessage('each bcc entry must have a non-empty localPart'),
  body('bcc.*.domain')
    .isString()
    .notEmpty()
    .withMessage('each bcc entry must have a non-empty domain'),
  body('bcc.*.displayName')
    .optional()
    .isString()
    .withMessage('each bcc displayName must be a string'),
  body('subject').optional().isString().withMessage('subject must be a string'),
  body('textBody')
    .optional()
    .isString()
    .withMessage('textBody must be a string'),
  body('htmlBody')
    .optional()
    .isString()
    .withMessage('htmlBody must be a string'),
  body('memberId')
    .optional()
    .isString()
    .withMessage('memberId must be a string'),
  body().custom(
    (value: { to?: unknown[]; cc?: unknown[]; bcc?: unknown[] }) => {
      const toLen = Array.isArray(value.to) ? value.to.length : 0;
      const ccLen = Array.isArray(value.cc) ? value.cc.length : 0;
      const bccLen = Array.isArray(value.bcc) ? value.bcc.length : 0;
      if (toLen + ccLen + bccLen === 0) {
        throw new Error('at least one recipient is required in to, cc, or bcc');
      }
      return true;
    },
  ),
];

// ─── Query Inbox validations ────────────────────────────────────────────────

export const queryInboxValidation: ValidationChain[] = [
  query('memberId')
    .optional()
    .isString()
    .withMessage('memberId must be a string'),
  query('readStatus')
    .optional()
    .isString()
    .isIn(['read', 'unread', 'all'])
    .withMessage('readStatus must be one of: read, unread, all'),
  query('senderAddress')
    .optional()
    .isString()
    .withMessage('senderAddress must be a string'),
  query('dateFrom')
    .optional()
    .isISO8601()
    .withMessage('dateFrom must be a valid ISO 8601 date'),
  query('dateTo')
    .optional()
    .isISO8601()
    .withMessage('dateTo must be a valid ISO 8601 date'),
  query('hasAttachments')
    .optional()
    .isBoolean()
    .withMessage('hasAttachments must be a boolean'),
  query('subjectContains')
    .optional()
    .isString()
    .withMessage('subjectContains must be a string'),
  query('searchText')
    .optional()
    .isString()
    .withMessage('searchText must be a string'),
  query('sortBy')
    .optional()
    .isString()
    .isIn(['date', 'sender', 'subject', 'size'])
    .withMessage('sortBy must be one of: date, sender, subject, size'),
  query('sortDirection')
    .optional()
    .isString()
    .isIn(['asc', 'desc'])
    .withMessage('sortDirection must be one of: asc, desc'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('page must be a positive integer'),
  query('pageSize')
    .optional()
    .isInt({ min: 1 })
    .withMessage('pageSize must be a positive integer'),
];

// ─── Unread Count validations ───────────────────────────────────────────────

export const getUnreadCountValidation: ValidationChain[] = [
  query('memberId')
    .isString()
    .notEmpty()
    .withMessage('memberId is required and must be a non-empty string'),
];

// ─── Message ID param validation ────────────────────────────────────────────

export const messageIdParamValidation: ValidationChain[] = [
  param('messageId').isString().notEmpty().withMessage('messageId is required'),
];

// ─── Reply Email validations ────────────────────────────────────────────────

export const replyEmailValidation: ValidationChain[] = [
  param('messageId').isString().notEmpty().withMessage('messageId is required'),
  body('from.localPart')
    .isString()
    .notEmpty()
    .withMessage('from.localPart is required and must be a non-empty string'),
  body('from.domain')
    .isString()
    .notEmpty()
    .withMessage('from.domain is required and must be a non-empty string'),
  body('from.displayName')
    .optional()
    .isString()
    .withMessage('from.displayName must be a string'),
  body('replyAll')
    .optional()
    .isBoolean()
    .withMessage('replyAll must be a boolean'),
  body('subject').optional().isString().withMessage('subject must be a string'),
  body('textBody')
    .optional()
    .isString()
    .withMessage('textBody must be a string'),
  body('htmlBody')
    .optional()
    .isString()
    .withMessage('htmlBody must be a string'),
  body('memberId')
    .optional()
    .isString()
    .withMessage('memberId must be a string'),
];

// ─── Forward Email validations ──────────────────────────────────────────────

export const forwardEmailValidation: ValidationChain[] = [
  param('messageId').isString().notEmpty().withMessage('messageId is required'),
  body('forwardTo')
    .isArray({ min: 1 })
    .withMessage('forwardTo must be a non-empty array'),
  body('forwardTo.*.localPart')
    .isString()
    .notEmpty()
    .withMessage('each forwardTo entry must have a non-empty localPart'),
  body('forwardTo.*.domain')
    .isString()
    .notEmpty()
    .withMessage('each forwardTo entry must have a non-empty domain'),
  body('forwardTo.*.displayName')
    .optional()
    .isString()
    .withMessage('each forwardTo displayName must be a string'),
  body('memberId')
    .optional()
    .isString()
    .withMessage('memberId must be a string'),
];

// ─── Mark As Read validations ───────────────────────────────────────────────

export const markAsReadValidation: ValidationChain[] = [
  param('messageId').isString().notEmpty().withMessage('messageId is required'),
  body('memberId')
    .optional()
    .isString()
    .withMessage('memberId must be a string'),
];

// ─── Delete Email validations ───────────────────────────────────────────────

export const deleteEmailValidation: ValidationChain[] = [
  param('messageId').isString().notEmpty().withMessage('messageId is required'),
];

// ─── Get Email Content validations ──────────────────────────────────────────

export const getEmailContentValidation: ValidationChain[] = [
  param('messageId').isString().notEmpty().withMessage('messageId is required'),
];

// ─── Get Email Thread validations ───────────────────────────────────────────

export const getEmailThreadValidation: ValidationChain[] = [
  param('messageId').isString().notEmpty().withMessage('messageId is required'),
];

// ─── Get Delivery Status validations ────────────────────────────────────────

export const getDeliveryStatusValidation: ValidationChain[] = [
  param('messageId').isString().notEmpty().withMessage('messageId is required'),
];
