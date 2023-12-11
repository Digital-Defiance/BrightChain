import type { OpaqueTypeDefinition } from '@digitaldefiance/branded-interface';
import { createOpaqueType } from '@digitaldefiance/branded-interface';

export const PasswordHash: OpaqueTypeDefinition<string> =
  createOpaqueType<string>('PasswordHash', 'string');
