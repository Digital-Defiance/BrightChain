/**
 * Energy account status for tracking storage contributions and consumption.
 *
 * @see Requirements 6.1, 10.1
 */
export interface IEnergyAccountStatus<TID = string> {
  memberId: TID;
  balance: number;
  availableBalance: number;
  earned: number;
  spent: number;
  reserved: number;
}
