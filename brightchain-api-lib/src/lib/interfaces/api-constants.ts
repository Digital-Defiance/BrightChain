/**
 * BrightChain API Constants Interfaces
 *
 * This module defines interfaces for API-specific constants.
 * The main IApiConstants interface extends IConstants from @digitaldefiance/node-express-suite
 * and adds BrightChain-specific constants.
 *
 * @see {@link https://github.com/Digital-Defiance/node-express-suite} for base interface
 * @module api-constants
 */

import { IConstants as IBrightChainConstants } from '@brightchain/brightchain-lib';
import { IConstants as IExpressConstants } from '@digitaldefiance/node-express-suite';

/**
 * API Constants interface that combines:
 * - Express constants from node-express-suite (JWT, FEC, site config, etc.)
 * - BrightChain constants (CBL, TUPLE, SEALING, etc.)
 *
 * Note: We use Omit to handle the PBKDF2_PROFILES conflict between the two interfaces.
 * IExpressConstants uses PbkdfProfiles (from node-ecies-lib) while IBrightChainConstants
 * uses Pbkdf2Profiles (from ecies-lib). We prefer the node-ecies-lib version for the API.
 */
export type IApiConstants = IExpressConstants &
  Omit<IBrightChainConstants, 'PBKDF2_PROFILES'>;
