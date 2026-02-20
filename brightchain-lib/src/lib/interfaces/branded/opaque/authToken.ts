import type { OpaqueTypeDefinition } from '@digitaldefiance/branded-interface';
import { createOpaqueType } from '@digitaldefiance/branded-interface';

export const AuthToken: OpaqueTypeDefinition<string> = createOpaqueType<string>(
  'AuthToken',
  'string',
);
