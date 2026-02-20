import type { OpaqueTypeDefinition } from '@digitaldefiance/branded-interface';
import { createOpaqueType } from '@digitaldefiance/branded-interface';

export const MnemonicPhrase: OpaqueTypeDefinition<string> =
  createOpaqueType<string>('MnemonicPhrase', 'string');
