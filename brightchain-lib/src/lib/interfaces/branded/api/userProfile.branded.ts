import type { InterfaceSchema } from '@digitaldefiance/branded-interface';
import { createBrandedInterface } from '@digitaldefiance/branded-interface';
import type { IUserProfile } from '../../userDto';

const userProfileSchema: InterfaceSchema = {
  memberId: { type: 'string' },
  username: { type: 'string' },
  email: { type: 'branded-primitive', ref: 'EmailString' },
  energyBalance: { type: 'number' },
  availableBalance: { type: 'number' },
  earned: { type: 'number' },
  spent: { type: 'number' },
  reserved: { type: 'number' },
  reputation: { type: 'number' },
  createdAt: { type: 'string' },
  lastUpdated: { type: 'string' },
  profile: { type: 'object', optional: true },
};

export const UserProfileDef = createBrandedInterface<
  IUserProfile<string> & Record<string, unknown>
>('IUserProfile', userProfileSchema);
