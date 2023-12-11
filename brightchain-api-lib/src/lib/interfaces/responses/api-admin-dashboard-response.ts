import { IAdminDashboardData } from '@brightchain/brightchain-lib';
import { IApiMessageResponse } from '@digitaldefiance/node-express-suite';

export interface IAdminDashboardApiResponse
  extends IApiMessageResponse,
    IAdminDashboardData {}
