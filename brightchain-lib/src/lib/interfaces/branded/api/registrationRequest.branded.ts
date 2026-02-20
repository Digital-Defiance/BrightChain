import type { InterfaceSchema } from '@digitaldefiance/branded-interface';
import { createBrandedInterface } from '@digitaldefiance/branded-interface';
import type { IRegistrationRequest } from '../../userDto';

const registrationRequestSchema: InterfaceSchema = {
  username: {
    type: 'string',
    validate: (v: unknown) => typeof v === 'string' && v.trim().length > 0,
  },
  email: { type: 'branded-primitive', ref: 'EmailString' },
  password: {
    type: 'string',
    validate: (v: unknown) => typeof v === 'string' && v.length > 0,
  },
};

export const RegistrationRequestDef = createBrandedInterface<
  IRegistrationRequest & Record<string, unknown>
>('IRegistrationRequest', registrationRequestSchema);
