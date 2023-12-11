import type { InterfaceSchema } from '@digitaldefiance/branded-interface';
import { createBrandedInterface } from '@digitaldefiance/branded-interface';
import type { IEnergyAccountStatus } from '../../clientProtocol/energyAccount';

const energyAccountStatusSchema: InterfaceSchema = {
  memberId: { type: 'string' },
  balance: { type: 'number' },
  availableBalance: { type: 'number' },
  earned: { type: 'number' },
  spent: { type: 'number' },
  reserved: { type: 'number' },
};

export const EnergyAccountStatusDef = createBrandedInterface<
  IEnergyAccountStatus<string> & Record<string, unknown>
>('IEnergyAccountStatus', energyAccountStatusSchema);
