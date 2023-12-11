/**
 * Response for storing a Super CBL
 */
export interface StoreSCBLResponse {
  success: boolean;
  message: string;
  magnetUrl: string;
  metadata: {
    hierarchyDepth: number;
    subCblCount: number;
    totalSize: number;
    rootBlockIds: string[];
  };
}
