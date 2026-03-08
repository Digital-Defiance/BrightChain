// Re-export all user validation symbols from @brightchain/node-express-suite
export type { IValidationError, IValidationResult } from '@brightchain/node-express-suite';
export {
  validateRegistration,
  validateLogin,
  validatePasswordChange,
  validateRecovery,
} from '@brightchain/node-express-suite';
