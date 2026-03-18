export interface IAuthToken {
  token: string;
  memberId: string;
  energyBalance: number;
  /** Server-generated mnemonic. Only present on registration when the user didn't provide their own. */
  mnemonic?: string;
}
