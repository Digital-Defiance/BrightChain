/**
 * Server interfaces for the BrightChain communication API.
 * These interfaces define the data models for Discord-style Servers,
 * which act as organizational containers for channels.
 *
 * All data interfaces are generic over two type parameters:
 *   TId   – the identifier type (string on the frontend, GuidV4Buffer on the backend)
 *   TData – the binary-data type (string/base64 on the frontend, Buffer on the backend)
 *
 * Requirements: 1.1, 1.2
 */

/**
 * Represents a category within a Server for organizing channels.
 * Categories group related channels together (e.g., "Text Channels", "Voice Channels").
 */
export interface IServerCategory<TId = string> {
  id: TId;
  name: string;
  position: number;
  channelIds: TId[];
}

/**
 * Represents a Server – an organizational container that groups related
 * channels together, analogous to a Discord server.
 */
export interface IServer<TId = string, TData = string> {
  id: TId;
  name: string;
  iconUrl?: string;
  ownerId: TId;
  memberIds: TId[];
  channelIds: TId[];
  categories: IServerCategory<TId>[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Represents a time-limited invite token for server access.
 */
export interface IServerInviteToken<TId = string> {
  token: string;
  serverId: TId;
  createdBy: TId;
  createdAt: Date;
  expiresAt?: Date;
  maxUses?: number;
  currentUses: number;
}

/**
 * Partial update interface for server settings.
 */
export interface IServerUpdate {
  name?: string;
  iconUrl?: string;
  categories?: IServerCategory[];
}
