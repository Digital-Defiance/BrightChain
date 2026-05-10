import type {
  IRemoteChange,
  IRemoteFileEntry,
  ISyncApiClient,
  ISyncEvent,
} from '@brightchain/digitalburnbag-lib';
import type { AxiosInstance } from 'axios';
import * as fs from 'fs';
import * as path from 'path';

/**
 * HTTP-based sync API client that communicates with the BrightChain backend.
 * Implements the ISyncApiClient interface from digitalburnbag-lib.
 */
export class HttpSyncApiClient implements ISyncApiClient<string> {
  constructor(
    private readonly axios: AxiosInstance,
    private readonly baseUrl: string,
  ) {}

  async getRemoteChanges(
    userId: string,
    since: Date,
  ): Promise<IRemoteChange<string>[]> {
    const response = await this.axios.get<IRemoteChange<string>[]>(
      `${this.baseUrl}/burnbag/sync/changes`,
      {
        params: {
          userId,
          since: since.toISOString(),
        },
      },
    );
    return response.data;
  }

  async downloadFile(fileId: string, localPath: string): Promise<void> {
    const response = await this.axios.get(
      `${this.baseUrl}/burnbag/files/${fileId}`,
      { responseType: 'stream' },
    );

    const dir = path.dirname(localPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const writer = fs.createWriteStream(localPath);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (response.data as any).pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
  }

  async downloadFileContent(fileId: string): Promise<Uint8Array> {
    const response = await this.axios.get(
      `${this.baseUrl}/burnbag/files/${fileId}`,
      { responseType: 'arraybuffer' },
    );
    return new Uint8Array(response.data as ArrayBuffer);
  }

  async uploadFile(fileId: string, localPath: string): Promise<void> {
    if (!fs.existsSync(localPath)) {
      throw new Error(`File not found: ${localPath}`);
    }
    const fileStream = fs.createReadStream(localPath);
    await this.axios.put(
      `${this.baseUrl}/burnbag/sync/upload/${fileId}`,
      fileStream,
      {
        headers: { 'Content-Type': 'application/octet-stream' },
      },
    );
  }

  async uploadFileContent(fileId: string, content: Uint8Array): Promise<void> {
    await this.axios.put(
      `${this.baseUrl}/burnbag/sync/upload/${fileId}`,
      Buffer.from(content),
      {
        headers: { 'Content-Type': 'application/octet-stream' },
      },
    );
  }

  async propagateLocalChange(event: ISyncEvent<string>): Promise<void> {
    await this.axios.post(`${this.baseUrl}/burnbag/sync/events`, event);
  }

  async listFolder(folderId: string): Promise<IRemoteFileEntry<string>[]> {
    const response = await this.axios.get<IRemoteFileEntry<string>[]>(
      `${this.baseUrl}/burnbag/folders/${folderId}/contents`,
    );
    return response.data;
  }

  async listRootFolder(userId: string): Promise<IRemoteFileEntry<string>[]> {
    const response = await this.axios.get<IRemoteFileEntry<string>[]>(
      `${this.baseUrl}/burnbag/folders/root/contents`,
      { params: { userId } },
    );
    return response.data;
  }

  async createRemoteFolder(
    parentFolderId: string,
    name: string,
  ): Promise<string> {
    const response = await this.axios.post<{ id: string }>(
      `${this.baseUrl}/burnbag/folders`,
      { parentFolderId, name },
    );
    return response.data.id;
  }

  async deleteRemoteEntry(
    entryId: string,
    isDirectory: boolean,
  ): Promise<void> {
    const endpoint = isDirectory ? 'folders' : 'files';
    await this.axios.delete(`${this.baseUrl}/burnbag/${endpoint}/${entryId}`);
  }

  async renameRemoteEntry(entryId: string, newName: string): Promise<void> {
    await this.axios.patch(
      `${this.baseUrl}/burnbag/files/${entryId}/metadata`,
      { fileName: newName },
    );
  }
}
