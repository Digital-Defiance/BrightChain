import type { InterfaceSchema } from '@digitaldefiance/branded-interface';
import { createBrandedInterface } from '@digitaldefiance/branded-interface';
import type { IHealthResponseData } from '../../responses/healthResponse';

// IHealthResponseData carries only domain-specific fields (no index signature).
const healthResponseSchema: InterfaceSchema = {
  status: { type: 'string' },
  uptime: { type: 'number' },
  timestamp: { type: 'string' },
  version: { type: 'string' },
  message: { type: 'string', optional: true },
};

export const HealthResponseDef = createBrandedInterface<
  IHealthResponseData & Record<string, unknown>
>('IHealthResponseData', healthResponseSchema);
