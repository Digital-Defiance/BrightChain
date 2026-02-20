import type { InterfaceSchema } from '@digitaldefiance/branded-interface';
import { createBrandedInterface } from '@digitaldefiance/branded-interface';
import type { ILoginRequest } from '../../userDto';

const loginRequestSchema: InterfaceSchema = {
  username: {
    type: 'string',
    validate: (v: unknown) => typeof v === 'string' && v.trim().length > 0,
  },
  password: {
    type: 'string',
    validate: (v: unknown) => typeof v === 'string' && v.length > 0,
  },
};

export const LoginRequestDef = createBrandedInterface<
  ILoginRequest & Record<string, unknown>
>('ILoginRequest', loginRequestSchema);
