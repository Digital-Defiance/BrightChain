import type { InterfaceSchema } from '@digitaldefiance/branded-interface';
import { createBrandedInterface } from '@digitaldefiance/branded-interface';
import type { IGetBlockResponseData } from '../../responses/getBlock';

const getBlockResponseSchema: InterfaceSchema = {
  data: { type: 'string' },
  blockId: { type: 'string' },
  message: { type: 'string', optional: true },
};

export const GetBlockResponseDef = createBrandedInterface<
  IGetBlockResponseData & Record<string, unknown>
>('IGetBlockResponseData', getBlockResponseSchema);
