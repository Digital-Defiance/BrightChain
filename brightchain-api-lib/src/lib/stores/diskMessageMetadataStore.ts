import {
  BlockSize,
  blockSizeToSizeString,
  IMessageMetadata,
  IMessageMetadataStore,
  MessageDeliveryStatus,
  MessageEncryptionScheme,
  MessagePriority,
  MessageQuery,
  MessageQueryOptions,
  StoreError,
  StoreErrorType,
} from '@brightchain/brightchain-lib';
import { existsSync } from 'fs';
import { readdir, readFile, stat, writeFile } from 'fs/promises';
import { join } from 'path';
import { DiskBlockMetadataStore } from './diskBlockMetadataStore';

const MESSAGE_METADATA_FILE_VERSION = 1;
const MESSAGE_METADATA_FILE_EXTENSION = '.mm.json';

interface MessageMetadataFile {
  version: number;
  blockId: string;
  createdAt: string;
  expiresAt: string | null;
  durabilityLevel: string;
  parityBlockIds: string[];
  accessCount: number;
  lastAccessedAt: string;
  replicationStatus: string;
  targetReplicationFactor: number;
  replicaNodeIds: string[];
  size: number;
  checksum: string;
  messageType: string;
  senderId: string;
  recipients: string[];
  priority: number;
  deliveryStatus: [string, string][];
  acknowledgments: [string, string][];
  encryptionScheme: string;
  isCBL: boolean;
  cblBlockIds?: string[];
}

export class DiskMessageMetadataStore
  extends DiskBlockMetadataStore
  implements IMessageMetadataStore
{
  constructor(storePath: string, blockSize: BlockSize) {
    super(storePath, blockSize);
  }

  private messageMetadataPath(blockId: string): string {
    if (!blockId || blockId.length < 2) {
      throw new StoreError(StoreErrorType.InvalidBlockIdTooShort);
    }
    const blockSizeString = blockSizeToSizeString(this.getBlockSize());
    const dir = join(
      this.getStorePath(),
      blockSizeString,
      blockId[0],
      blockId[1],
    );
    return join(dir, blockId + MESSAGE_METADATA_FILE_EXTENSION);
  }

  private serializeMessageMetadata(
    metadata: IMessageMetadata,
  ): MessageMetadataFile {
    return {
      version: MESSAGE_METADATA_FILE_VERSION,
      blockId: metadata.blockId,
      createdAt: metadata.createdAt.toISOString(),
      expiresAt: metadata.expiresAt ? metadata.expiresAt.toISOString() : null,
      durabilityLevel: metadata.durabilityLevel,
      parityBlockIds: [...metadata.parityBlockIds],
      accessCount: metadata.accessCount,
      lastAccessedAt: metadata.lastAccessedAt.toISOString(),
      replicationStatus: metadata.replicationStatus,
      targetReplicationFactor: metadata.targetReplicationFactor,
      replicaNodeIds: [...metadata.replicaNodeIds],
      size: metadata.size,
      checksum: metadata.checksum,
      messageType: metadata.messageType,
      senderId: metadata.senderId,
      recipients: [...metadata.recipients],
      priority: metadata.priority,
      deliveryStatus: Array.from(metadata.deliveryStatus.entries()),
      acknowledgments: Array.from(metadata.acknowledgments.entries()).map(
        ([k, v]) => [k, v.toISOString()],
      ),
      encryptionScheme: metadata.encryptionScheme,
      isCBL: metadata.isCBL,
      cblBlockIds: metadata.cblBlockIds ? [...metadata.cblBlockIds] : undefined,
    };
  }

  private deserializeMessageMetadata(
    file: MessageMetadataFile,
  ): IMessageMetadata {
    return {
      blockId: file.blockId,
      createdAt: new Date(file.createdAt),
      expiresAt: file.expiresAt ? new Date(file.expiresAt) : null,
      durabilityLevel:
        file.durabilityLevel as IMessageMetadata['durabilityLevel'],
      parityBlockIds: [...file.parityBlockIds],
      accessCount: file.accessCount,
      lastAccessedAt: new Date(file.lastAccessedAt),
      replicationStatus:
        file.replicationStatus as IMessageMetadata['replicationStatus'],
      targetReplicationFactor: file.targetReplicationFactor,
      replicaNodeIds: [...file.replicaNodeIds],
      size: file.size,
      checksum: file.checksum,
      messageType: file.messageType,
      senderId: file.senderId,
      recipients: [...file.recipients],
      priority: Number(file.priority) as MessagePriority,
      deliveryStatus: new Map(
        file.deliveryStatus.map(([k, v]) => [k, v as MessageDeliveryStatus]),
      ),
      acknowledgments: new Map(
        file.acknowledgments.map(([k, v]) => [k, new Date(v)]),
      ),
      encryptionScheme: file.encryptionScheme as MessageEncryptionScheme,
      isCBL: file.isCBL,
      cblBlockIds: file.cblBlockIds ? [...file.cblBlockIds] : undefined,
    };
  }

  async storeMessageMetadata(metadata: IMessageMetadata): Promise<void> {
    const filePath = this.messageMetadataPath(metadata.blockId);

    // Check if block metadata already exists
    if (!this.has(metadata.blockId)) {
      await this.create(metadata);
    } else {
      await this.update(metadata.blockId, metadata);
    }

    // Write message-specific metadata
    const serialized = this.serializeMessageMetadata(metadata);
    const json = JSON.stringify(serialized, null, 2);
    await writeFile(filePath, json, 'utf-8');
  }

  async queryMessages(query: MessageQuery): Promise<IMessageMetadata[]> {
    const results: IMessageMetadata[] = [];
    const {
      recipientId,
      senderId,
      messageType,
      startDate,
      endDate,
      priority,
      page = 0,
      pageSize = 50,
    } = query;

    await this.scanAllMessageMetadata(async (meta) => {
      if (recipientId && !meta.recipients.includes(recipientId)) return;
      if (senderId && meta.senderId !== senderId) return;
      if (messageType && meta.messageType !== messageType) return;
      if (startDate && meta.createdAt < startDate) return;
      if (endDate && meta.createdAt > endDate) return;
      if (priority !== undefined && meta.priority !== priority) return;
      results.push(meta);
    });

    const start = page * pageSize;
    return results.slice(start, start + pageSize);
  }

  async updateDeliveryStatus(
    messageId: string,
    recipientId: string,
    status: MessageDeliveryStatus,
  ): Promise<void> {
    const meta = await this.getMessageMetadata(messageId);
    if (!meta) {
      throw new StoreError(StoreErrorType.KeyNotFound, undefined, {
        KEY: messageId,
      });
    }
    meta.deliveryStatus.set(recipientId, status);
    await this.storeMessageMetadata(meta);
  }

  async recordAcknowledgment(
    messageId: string,
    recipientId: string,
    timestamp: Date,
  ): Promise<void> {
    const meta = await this.getMessageMetadata(messageId);
    if (!meta) {
      throw new StoreError(StoreErrorType.KeyNotFound, undefined, {
        KEY: messageId,
      });
    }
    meta.acknowledgments.set(recipientId, timestamp);
    meta.deliveryStatus.set(recipientId, MessageDeliveryStatus.DELIVERED);
    await this.storeMessageMetadata(meta);
  }

  async getMessagesByRecipient(
    recipientId: string,
    options?: MessageQueryOptions,
  ): Promise<IMessageMetadata[]> {
    const results: IMessageMetadata[] = [];
    const {
      startDate,
      endDate,
      messageType,
      priority,
      limit = 50,
      offset = 0,
    } = options || {};

    await this.scanAllMessageMetadata(async (meta) => {
      if (!meta.recipients.includes(recipientId)) return;
      if (startDate && meta.createdAt < startDate) return;
      if (endDate && meta.createdAt > endDate) return;
      if (messageType && meta.messageType !== messageType) return;
      if (priority !== undefined && meta.priority !== priority) return;
      results.push(meta);
    });

    return results.slice(offset, offset + limit);
  }

  async getMessagesBySender(
    senderId: string,
    options?: MessageQueryOptions,
  ): Promise<IMessageMetadata[]> {
    const results: IMessageMetadata[] = [];
    const {
      startDate,
      endDate,
      messageType,
      priority,
      limit = 50,
      offset = 0,
    } = options || {};

    await this.scanAllMessageMetadata(async (meta) => {
      if (meta.senderId !== senderId) return;
      if (startDate && meta.createdAt < startDate) return;
      if (endDate && meta.createdAt > endDate) return;
      if (messageType && meta.messageType !== messageType) return;
      if (priority !== undefined && meta.priority !== priority) return;
      results.push(meta);
    });

    return results.slice(offset, offset + limit);
  }

  private async getMessageMetadata(
    blockId: string,
  ): Promise<IMessageMetadata | null> {
    const filePath = this.messageMetadataPath(blockId);
    if (!existsSync(filePath)) return null;

    try {
      const json = await readFile(filePath, 'utf-8');
      const file = JSON.parse(json) as MessageMetadataFile;
      return this.deserializeMessageMetadata(file);
    } catch {
      return null;
    }
  }

  private async scanAllMessageMetadata(
    callback: (metadata: IMessageMetadata) => Promise<void>,
  ): Promise<void> {
    const blockSizeString = blockSizeToSizeString(this.getBlockSize());
    const basePath = join(this.getStorePath(), blockSizeString);

    if (!existsSync(basePath)) return;

    try {
      const firstLevelDirs = await readdir(basePath);

      for (const firstDir of firstLevelDirs) {
        const firstLevelPath = join(basePath, firstDir);
        const firstStats = await stat(firstLevelPath);
        if (!firstStats.isDirectory()) continue;

        const secondLevelDirs = await readdir(firstLevelPath);

        for (const secondDir of secondLevelDirs) {
          const secondLevelPath = join(firstLevelPath, secondDir);
          const secondStats = await stat(secondLevelPath);
          if (!secondStats.isDirectory()) continue;

          const files = await readdir(secondLevelPath);
          const metadataFiles = files.filter((f) =>
            f.endsWith(MESSAGE_METADATA_FILE_EXTENSION),
          );

          for (const metadataFile of metadataFiles) {
            const blockId = metadataFile.slice(
              0,
              -MESSAGE_METADATA_FILE_EXTENSION.length,
            );
            const metadata = await this.getMessageMetadata(blockId);
            if (metadata) await callback(metadata);
          }
        }
      }
    } catch {
      // Empty or corrupted store
    }
  }
}
