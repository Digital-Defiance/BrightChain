/**
 * Re-exports from @digitaldefiance/node-express-suite (upstream).
 * Consumers can import these through @brightchain/node-express-suite
 * instead of depending on the upstream package directly.
 */
export {
  Application,
  createExpressConstants,
  AppRouter,
} from '@digitaldefiance/node-express-suite';

export type {
  IApplication,
  IConstants,
  IAuthenticationProvider,
  IDatabasePlugin,
  IEnvironment,
} from '@digitaldefiance/node-express-suite';
