import { IBrightDateNowResponseData } from '@brightchain/brightchain-lib';
import { IApiMessageResponse } from '@digitaldefiance/node-express-suite';

/**
 * API response for GET /api/brightdate/now.
 * Combines the standard API message envelope with BrightDate data.
 */
export interface IBrightDateNowApiResponse
  extends IApiMessageResponse,
    IBrightDateNowResponseData {}
