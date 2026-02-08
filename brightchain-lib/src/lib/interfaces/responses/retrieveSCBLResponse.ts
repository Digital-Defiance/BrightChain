/**
 * Response for retrieving a Super CBL
 */
export interface RetrieveSCBLResponse {
  success: boolean;
  message: string;
  data: string; // Base64 encoded file data
  isEncrypted: boolean;
}
