// Re-export all user validation symbols from @brightchain/node-express-suite
export {
  validateLogin,
  validatePasswordChange,
  validateRecovery,
  validateRegistration,
} from '@brightchain/node-express-suite';
export type {
  IValidationError,
  IValidationResult,
} from '@brightchain/node-express-suite';
