import { CHECKSUM, Member, PlatformID } from '@digitaldefiance/ecies-lib';
import { RawDataBlock } from '../../blocks/rawData';
import { BlockEncryptionType } from '../../enumerations/blockEncryptionType';
import { DurabilityLevel } from '../../enumerations/durabilityLevel';
import { MessageDeliveryStatus } from '../../enumerations/messaging/messageDeliveryStatus';
import { MessageEncryptionScheme } from '../../enumerations/messaging/messageEncryptionScheme';
import { MessageErrorType } from '../../enumerations/messaging/messageErrorType';
import { MessagePriority } from '../../enumerations/messaging/messagePriority';
import { ReplicationStatus } from '../../enumerations/replicationStatus';
import { MessageError } from '../../errors/messaging/messageError';
import { IMessageMetadata } from '../../interfaces/messaging/messageMetadata';
import { IMessageMetadataStore } from '../../interfaces/messaging/messageMetadataStore';
import {
  DEFAULT_MESSAGE_SYSTEM_CONFIG,
  IMessageSystemConfig,
} from '../../interfaces/messaging/messageSystemConfig';
import { IBlockStore } from '../../interfaces/storage/blockStore';
import { Checksum } from '../../types/checksum';
import { CBLService } from '../cblService';
import { ChecksumService } from '../checksum.service';
import { TupleStorageService } from '../tupleStorageService';
import { IMessageLogger } from './messageLogger';
import { IMessageMetricsCollector } from './messageMetrics';

export interface IMessageCBLOptions {
  messageType: string;
  senderId: string;
  recipients: string[];
  priority: MessagePriority;
  encryptionScheme: MessageEncryptionScheme;
}

export class MessageCBLService<TID extends PlatformID = Uint8Array> {
  private readonly config: IMessageSystemConfig;
  private readonly tupleService: TupleStorageService;

  constructor(
    private readonly cblService: CBLService<TID>,
    private readonly checksumService: ChecksumService,
    private readonly blockStore: IBlockStore,
    private readonly metadataStore?: IMessageMetadataStore,
    config?: Partial<IMessageSystemConfig>,
    private readonly metrics?: IMessageMetricsCollector,
    private readonly logger?: IMessageLogger,
  ) {
    this.config = { ...DEFAULT_MESSAGE_SYSTEM_CONFIG, ...config };
    this.tupleService = new TupleStorageService(blockStore);
  }

  async createMessage(
    content: Uint8Array,
    creator: Member<TID>,
    options: IMessageCBLOptions,
  ): Promise<{
    messageId: string;
    contentBlockIds: string[];
    magnetUrl: string;
  }> {
    this.validateMessageOptions(options);

    if (content.length > this.config.maxMessageSizeThreshold) {
      throw new MessageError(
        MessageErrorType.MESSAGE_TOO_LARGE,
        `Message size ${content.length} exceeds maximum ${this.config.maxMessageSizeThreshold}`,
        { size: content.length, max: this.config.maxMessageSizeThreshold },
      );
    }

    const contentBlockIds: string[] = [];
    const blockSize = this.blockStore.blockSize;
    const payloadPerBlock = blockSize as number;
    const totalBlocks = Math.ceil(content.length / payloadPerBlock);

    try {
      for (let i = 0; i < totalBlocks; i++) {
        const offset = i * payloadPerBlock;
        const end = Math.min(offset + payloadPerBlock, content.length);
        let blockData = content.slice(offset, end);

        if (blockData.length < payloadPerBlock) {
          const padded = new Uint8Array(payloadPerBlock);
          padded.set(blockData);
          blockData = padded;
        }

        const block = new RawDataBlock(blockSize, blockData, new Date());
        await this.retryOperation(() => this.blockStore.setData(block));
        contentBlockIds.push(block.idChecksum.toHex());
      }

      const blockIdsArray = this.serializeBlockIds(contentBlockIds);
      const cblHeader = this.cblService.makeCblHeader(
        creator,
        new Date(),
        contentBlockIds.length,
        content.length,
        blockIdsArray,
        blockSize,
        BlockEncryptionType.None,
      );

      const totalSize = cblHeader.headerData.length + blockIdsArray.length;

      // Create CBL data with exact size needed (no pre-padding)
      const messageCBLData = new Uint8Array(totalSize);
      messageCBLData.set(cblHeader.headerData, 0);
      messageCBLData.set(blockIdsArray, cblHeader.headerData.length);

      // Store CBL as TUPLE for complete OFF compliance
      const tupleResult = await this.tupleService.storeTuple(messageCBLData, {
        durabilityLevel: this.config.durabilityLevel,
      });
      const messageId = tupleResult.magnetUrl;
      const magnetUrl = tupleResult.magnetUrl;

      if (this.metadataStore) {
        const metadata: IMessageMetadata = {
          blockId: messageId,
          size: blockSize,
          createdAt: new Date(),
          expiresAt: null,
          durabilityLevel: DurabilityLevel.Standard,
          parityBlockIds: [],
          accessCount: 0,
          lastAccessedAt: new Date(),
          replicationStatus: ReplicationStatus.Pending,
          targetReplicationFactor: 0,
          replicaNodeIds: [],
          checksum: messageId,
          messageType: options.messageType,
          senderId: options.senderId,
          recipients: options.recipients,
          priority: options.priority,
          deliveryStatus: new Map(
            options.recipients.map((r) => [r, MessageDeliveryStatus.PENDING]),
          ),
          acknowledgments: new Map(),
          encryptionScheme: options.encryptionScheme,
          isCBL: true,
          cblBlockIds: contentBlockIds,
        };
        await this.retryOperation(() =>
          this.metadataStore!.storeMessageMetadata(metadata),
        );
      }

      this.metrics?.recordMessageSent();
      this.logger?.logMessageCreated(
        messageId,
        options.senderId,
        options.recipients.length,
      );

      return { messageId, contentBlockIds, magnetUrl };
    } catch (error) {
      await this.cleanupPartialState(contentBlockIds);
      this.metrics?.recordMessageFailed();

      // If it's already a MessageError, rethrow it
      if (error instanceof MessageError) {
        throw error;
      }

      throw new MessageError(
        MessageErrorType.STORAGE_FAILED,
        'Failed to create message after retries',
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          originalError: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        },
      );
    }
  }

  async getMessageContent(messageId: string): Promise<Uint8Array> {
    try {
      // Retrieve TUPLE using magnet URL
      const components = this.tupleService.parseTupleMagnetUrl(messageId);
      const messageCBLData = await this.tupleService.retrieveTuple(
        components.dataBlockId,
        components.randomizerBlockIds,
        components.parityBlockIds,
      );

      const header = this.cblService.parseBaseHeader(messageCBLData);
      const contentBlockIds = this.extractBlockIds(
        messageCBLData,
        header.cblAddressCount,
      );

      const contentChunks: Uint8Array[] = [];
      for (const blockId of contentBlockIds) {
        const block = await this.blockStore.getData(Checksum.fromHex(blockId));
        contentChunks.push(block.data);
      }

      return this.concatenateChunks(contentChunks, header.originalDataLength);
    } catch (error) {
      throw new MessageError(
        MessageErrorType.MESSAGE_NOT_FOUND,
        `Failed to retrieve message ${messageId}`,
        {
          messageId,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      );
    }
  }

  async getMessageMetadata(
    messageId: string,
  ): Promise<IMessageMetadata | null> {
    if (!this.metadataStore) return null;
    const metadata = await this.metadataStore.get(messageId);
    return metadata as IMessageMetadata | null;
  }

  private serializeBlockIds(blockIds: string[]): Uint8Array {
    const result = new Uint8Array(
      blockIds.length * CHECKSUM.SHA3_BUFFER_LENGTH,
    );
    for (let i = 0; i < blockIds.length; i++) {
      result.set(
        Checksum.fromHex(blockIds[i]).toUint8Array(),
        i * CHECKSUM.SHA3_BUFFER_LENGTH,
      );
    }
    return result;
  }

  private extractBlockIds(data: Uint8Array, count: number): string[] {
    const headerLength = this.cblService.getHeaderLength(data);
    const ids: string[] = [];
    for (let i = 0; i < count; i++) {
      const offset = headerLength + i * CHECKSUM.SHA3_BUFFER_LENGTH;
      ids.push(
        Checksum.fromUint8Array(
          data.subarray(offset, offset + CHECKSUM.SHA3_BUFFER_LENGTH),
        ).toHex(),
      );
    }
    return ids;
  }

  private concatenateChunks(
    chunks: Uint8Array[],
    totalLength: number,
  ): Uint8Array {
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      const copyLength = Math.min(chunk.length, totalLength - offset);
      result.set(chunk.subarray(0, copyLength), offset);
      offset += copyLength;
      if (offset >= totalLength) break;
    }
    return result;
  }

  private validateMessageOptions(options: IMessageCBLOptions): void {
    if (!options.messageType || options.messageType.trim() === '') {
      throw new MessageError(
        MessageErrorType.INVALID_MESSAGE_TYPE,
        'Message type is required',
        { messageType: options.messageType },
      );
    }
    if (!options.senderId || options.senderId.trim() === '') {
      throw new MessageError(
        MessageErrorType.INVALID_RECIPIENT,
        'Sender ID is required',
        { senderId: options.senderId },
      );
    }
    if (options.recipients.length > this.config.maxRecipientsPerMessage) {
      throw new MessageError(
        MessageErrorType.INVALID_RECIPIENT,
        `Recipient count ${options.recipients.length} exceeds maximum ${this.config.maxRecipientsPerMessage}`,
        {
          count: options.recipients.length,
          max: this.config.maxRecipientsPerMessage,
        },
      );
    }
  }

  private async retryOperation<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error | undefined;
    for (
      let attempt = 0;
      attempt < this.config.storageRetryAttempts;
      attempt++
    ) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        if (attempt < this.config.storageRetryAttempts - 1) {
          await new Promise((resolve) =>
            setTimeout(
              resolve,
              this.config.storageRetryDelayMs * Math.pow(2, attempt),
            ),
          );
        }
      }
    }
    throw lastError;
  }

  private async cleanupPartialState(blockIds: string[]): Promise<void> {
    for (const blockId of blockIds) {
      try {
        await this.blockStore.delete(Checksum.fromHex(blockId));
      } catch {
        // Ignore cleanup errors
      }
    }
  }
}
