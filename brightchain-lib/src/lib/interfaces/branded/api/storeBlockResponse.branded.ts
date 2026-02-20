import type { InterfaceSchema } from '@digitaldefiance/branded-interface';
import { createBrandedInterface } from '@digitaldefiance/branded-interface';
import type { IStoreBlockResponseData } from '../../responses/storeBlock';

const storeBlockResponseSchema: InterfaceSchema = {
  blockId: { type: 'string' },
  message: { type: 'string', optional: true },
};

export const StoreBlockResponseDef = createBrandedInterface<
  IStoreBlockResponseData & Record<string, unknown>
>('IStoreBlockResponseData', storeBlockResponseSchema);
