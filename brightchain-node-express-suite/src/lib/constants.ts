import { createExpressConstants } from '@digitaldefiance/node-express-suite';

/**
 * Generic BrightDB constants using createExpressConstants with minimal defaults.
 * Domain-specific constants (site name, tagline, etc.) are set by consuming libraries.
 */
export const BrightDbConstants = createExpressConstants({
  Site: 'BrightDB',
});
