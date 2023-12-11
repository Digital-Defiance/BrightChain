export interface EmergencyAccessConfig {
  vaultId: string;
  threshold: number;
  totalShares: number;
  trustees: string[];
}

export interface EncryptedShare {
  trusteeId: string;
  encryptedShareData: Uint8Array;
}
