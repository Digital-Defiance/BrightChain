import { IRegistrationResponseData } from '@brightchain/brightchain-lib';
import { IApiMessageResponse } from '@digitaldefiance/node-express-suite';

/**
 * API response for successful user registration
 */
export interface IApiRegistrationResponse
  extends IApiMessageResponse, IRegistrationResponseData {}
