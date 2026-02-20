import type { InterfaceSchema } from '@digitaldefiance/branded-interface';
import { createBrandedInterface } from '@digitaldefiance/branded-interface';
import type { IClientEvent } from '../../clientProtocol/clientEvent';

// payload is typed as `unknown` in the source interface; we use 'object' with
// nullable so the schema accepts any object or null payload at the wire level.
const clientEventSchema: InterfaceSchema = {
  eventType: { type: 'string' },
  accessTier: { type: 'string' },
  payload: { type: 'object', nullable: true },
  timestamp: { type: 'string' },
  correlationId: { type: 'string' },
  targetPoolId: { type: 'string', optional: true },
  targetMemberId: { type: 'string', optional: true },
};

export const ClientEventDef = createBrandedInterface<
  IClientEvent<string> & Record<string, unknown>
>('IClientEvent', clientEventSchema);
