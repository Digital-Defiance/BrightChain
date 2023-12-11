/**
 * Re-exports from @digitaldefiance/node-express-suite (upstream).
 * Consumers can import these through @brightchain/node-express-suite
 * instead of depending on the upstream package directly.
 */
export {
  AbstractJwtService,
  AbstractRoleService,
  AppRouter,
  Application,
  createExpressConstants,
} from '@digitaldefiance/node-express-suite';

export type {
  IApplication,
  IAuthenticationProvider,
  IConstants,
  IDatabasePlugin,
  IEnvironment,
  IJwtService,
  IRoleService,
} from '@digitaldefiance/node-express-suite';
