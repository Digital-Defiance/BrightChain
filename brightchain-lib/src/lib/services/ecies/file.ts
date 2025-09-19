import { IEciesFileService } from '../../interfaces/ecies-file-service';
import { ECIESService } from './service';

interface ChunkedFileHeader {
  version: number;
  chunkSize: number;
  totalChunks: number;
  originalSize: number;
}

export class EciesFileService implements IEciesFileService {
  private static readonly CHUNK_SIZE = 1024 * 1024; // 1MB chunks
  private static readonly HEADER_SIZE = 20; // 4 bytes each: version, chunkSize, totalChunks, originalSize, padding

  constructor(
    private eciesService: ECIESService,
    private userPrivateKey: Uint8Array,
  ) {}

  async encryptFile(
    file: File,
    recipientPublicKey: Uint8Array,
  ): Promise<Uint8Array> {
    const totalChunks = Math.ceil(file.size / EciesFileService.CHUNK_SIZE);
    const header: ChunkedFileHeader = {
      version: 1,
      chunkSize: EciesFileService.CHUNK_SIZE,
      totalChunks,
      originalSize: file.size,
    };

    const headerBytes = this.serializeHeader(header);
    const encryptedHeader = await this.eciesService.encryptSimpleOrSingle(
      false,
      recipientPublicKey,
      headerBytes,
    );

    const chunks: Uint8Array[] = [encryptedHeader];

    for (let i = 0; i < totalChunks; i++) {
      const offset = i * EciesFileService.CHUNK_SIZE;
      const chunk = file.slice(offset, offset + EciesFileService.CHUNK_SIZE);
      const chunkData = new Uint8Array(await chunk.arrayBuffer());
      const encryptedChunk = await this.eciesService.encryptSimpleOrSingle(
        false,
        recipientPublicKey,
        chunkData,
      );
      chunks.push(encryptedChunk);
    }

    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    return result;
  }

  async decryptFile(encryptedData: Uint8Array): Promise<Uint8Array> {
    const { header, chunks } = await this.parseEncryptedFile(encryptedData);
    const decryptedChunks: Uint8Array[] = [];

    for (const chunk of chunks) {
      const decrypted = await this.eciesService.decryptSimpleOrSingleWithHeader(
        false,
        this.userPrivateKey,
        chunk,
      );
      decryptedChunks.push(decrypted);
    }

    const result = new Uint8Array(header.originalSize);
    let offset = 0;
    for (const chunk of decryptedChunks) {
      const copyLength = Math.min(chunk.length, header.originalSize - offset);
      result.set(chunk.subarray(0, copyLength), offset);
      offset += copyLength;
    }
    return result;
  }

  downloadEncryptedFile(encryptedData: Uint8Array, filename: string): void {
    this.downloadFile(encryptedData, `${filename}.encrypted`);
  }

  downloadDecryptedFile(decryptedData: Uint8Array, filename: string): void {
    this.downloadFile(decryptedData, filename);
  }

  private serializeHeader(header: ChunkedFileHeader): Uint8Array {
    const buffer = new ArrayBuffer(EciesFileService.HEADER_SIZE);
    const view = new DataView(buffer);
    view.setUint32(0, header.version, false);
    view.setUint32(4, header.chunkSize, false);
    view.setUint32(8, header.totalChunks, false);
    view.setUint32(12, header.originalSize, false);
    return new Uint8Array(buffer);
  }

  private deserializeHeader(data: Uint8Array): ChunkedFileHeader {
    const view = new DataView(
      data.buffer,
      data.byteOffset,
      EciesFileService.HEADER_SIZE,
    );
    return {
      version: view.getUint32(0, false),
      chunkSize: view.getUint32(4, false),
      totalChunks: view.getUint32(8, false),
      originalSize: view.getUint32(12, false),
    };
  }

  private async parseEncryptedFile(encryptedData: Uint8Array): Promise<{
    header: ChunkedFileHeader;
    chunks: Uint8Array[];
  }> {
    // First, decrypt the header to get metadata
    const headerLength = this.eciesService.computeEncryptedLengthFromDataLength(
      EciesFileService.HEADER_SIZE,
      'single',
    );

    const encryptedHeader = encryptedData.subarray(0, headerLength);
    const decryptedHeaderBytes =
      await this.eciesService.decryptSimpleOrSingleWithHeader(
        false,
        this.userPrivateKey,
        encryptedHeader,
      );

    const header = this.deserializeHeader(decryptedHeaderBytes);
    const chunks: Uint8Array[] = [];
    let offset = headerLength;

    for (let i = 0; i < header.totalChunks; i++) {
      const chunkLength =
        this.eciesService.computeEncryptedLengthFromDataLength(
          i === header.totalChunks - 1
            ? header.originalSize % header.chunkSize || header.chunkSize
            : header.chunkSize,
          'single',
        );

      chunks.push(encryptedData.subarray(offset, offset + chunkLength));
      offset += chunkLength;
    }

    return { header, chunks };
  }

  private downloadFile(data: Uint8Array, filename: string): void {
    const blob = new Blob([data.slice()]);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
