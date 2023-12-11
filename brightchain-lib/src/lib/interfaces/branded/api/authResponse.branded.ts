import type { InterfaceSchema } from '@digitaldefiance/branded-interface';
import { createBrandedInterface } from '@digitaldefiance/branded-interface';
import type { IAuthResponse } from '../../userDto';

const authResponseSchema: InterfaceSchema = {
  token: {
    type: 'string',
    validate: (v: unknown) => typeof v === 'string' && v.length > 0,
  },
  memberId: {
    type: 'string',
    validate: (v: unknown) => typeof v === 'string' && v.length > 0,
  },
  energyBalance: { type: 'number' },
};

export const AuthResponseDef = createBrandedInterface<
  IAuthResponse<string> & Record<string, unknown>
>('IAuthResponse', authResponseSchema);
